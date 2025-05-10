import { parentPort } from 'worker_threads';
import WebTorrent from 'webtorrent';

console.log('Worker thread starting...');

// Initialize WebTorrent client
const client = new WebTorrent({
  tracker: {
    announce: ['wss://tracker.openwebtorrent.com', 'wss://tracker.btorrent.xyz']
  }
});

console.log('WebTorrent client initialized');

// Track active streams and their states
const activeStreams = new Map();

// Send ready signal to main thread
parentPort.postMessage({ type: 'WORKER_READY' });

// Handle messages from the main thread
parentPort.on('message', async message => {
  const { type, data } = message;
  console.log(`Received message type: ${type}`);

  try {
    switch (type) {
      case 'ADD_TORRENT': {
        const { magnetURI } = data;
        console.log(`Adding torrent: ${magnetURI}`);

        // Check if torrent already exists
        const existingTorrent = client.get(magnetURI);
        if (existingTorrent) {
          console.log('Torrent already exists, returning existing info');
          parentPort.postMessage({
            type: 'TORRENT_READY',
            data: {
              name: existingTorrent.name,
              infoHash: existingTorrent.infoHash,
              files: existingTorrent.files.map(f => ({
                name: f.name,
                length: f.length
              }))
            }
          });
          return;
        }

        // Add new torrent without download path
        console.log('Adding new torrent...');
        client.add(magnetURI, torrent => {
          console.log('Torrent added, setting up event listeners');

          // Send ready event immediately after adding
          parentPort.postMessage({
            type: 'TORRENT_READY',
            data: {
              name: torrent.name,
              infoHash: torrent.infoHash,
              files: torrent.files.map(f => ({
                name: f.name,
                length: f.length
              }))
            }
          });

          torrent.on('error', err => {
            console.error('Torrent error:', err);
            parentPort.postMessage({
              type: 'TORRENT_ERROR',
              data: {
                error: err.message
              }
            });
          });

          torrent.on('done', () => {
            console.log('Torrent download completed');
            parentPort.postMessage({
              type: 'TORRENT_DONE',
              data: {
                infoHash: torrent.infoHash
              }
            });
          });
        });
        break;
      }

      case 'GET_FILE_STREAM': {
        const { infoHash, fileIndex } = data;
        const torrent = client.get(infoHash);

        if (!torrent) {
          throw new Error(`Torrent ${infoHash} not found`);
        }

        const file = torrent.files[fileIndex];
        if (!file) {
          throw new Error(`File index ${fileIndex} not found in torrent`);
        }

        // Create a readable stream for the file
        const stream = file.createReadStream();
        const streamKey = `${infoHash}:${fileIndex}`;
        let isStreaming = true;

        // Store stream state
        activeStreams.set(streamKey, { stream, isStreaming });

        // Send stream chunks to main thread
        stream.on('data', chunk => {
          if (!isStreaming) return;

          try {
            // Create a copy of the chunk to avoid detached buffer issues
            const chunkCopy = Buffer.from(chunk);
            const canContinue = parentPort.postMessage({
              type: 'FILE_CHUNK',
              data: {
                infoHash,
                fileIndex,
                chunk: chunkCopy
              }
            });

            if (!canContinue) {
              console.log(`Pausing stream: ${streamKey}`);
              stream.pause();
            }
          } catch (error) {
            console.error(`Error sending chunk for ${streamKey}:`, error);
            isStreaming = false;
            stream.destroy(error);
            activeStreams.delete(streamKey);
            parentPort.postMessage({
              type: 'FILE_ERROR',
              data: {
                infoHash,
                fileIndex,
                error: error.message
              }
            });
          }
        });

        stream.on('end', () => {
          if (!isStreaming) return;
          isStreaming = false;
          activeStreams.delete(streamKey);
          parentPort.postMessage({
            type: 'FILE_END',
            data: {
              infoHash,
              fileIndex
            }
          });
        });

        stream.on('error', err => {
          if (!isStreaming) return;
          isStreaming = false;
          activeStreams.delete(streamKey);
          parentPort.postMessage({
            type: 'FILE_ERROR',
            data: {
              infoHash,
              fileIndex,
              error: err.message
            }
          });
        });
        break;
      }

      case 'PAUSE_STREAM': {
        const { infoHash, fileIndex } = data;
        const streamKey = `${infoHash}:${fileIndex}`;
        const streamState = activeStreams.get(streamKey);

        if (streamState) {
          console.log(`Pausing stream: ${streamKey}`);
          streamState.isStreaming = false;
          streamState.stream.pause();
        }
        break;
      }

      case 'RESUME_STREAM': {
        const { infoHash, fileIndex } = data;
        const streamKey = `${infoHash}:${fileIndex}`;
        const streamState = activeStreams.get(streamKey);

        if (streamState) {
          console.log(`Resuming stream: ${streamKey}`);
          streamState.isStreaming = true;
          streamState.stream.resume();
        }
        break;
      }

      case 'REMOVE_TORRENT': {
        const { infoHash } = data;
        client.remove(infoHash, err => {
          if (err) {
            parentPort.postMessage({
              type: 'REMOVE_ERROR',
              data: {
                infoHash,
                error: err.message
              }
            });
          } else {
            parentPort.postMessage({
              type: 'TORRENT_REMOVED',
              data: { infoHash }
            });
          }
        });
        break;
      }

      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    console.error('Worker error:', error);
    parentPort.postMessage({
      type: 'ERROR',
      data: {
        error: error.message
      }
    });
  }
});

// Handle worker termination
process.on('SIGTERM', () => {
  // Clean up all active streams
  for (const [streamKey, { stream }] of activeStreams.entries()) {
    console.log(`Cleaning up stream: ${streamKey}`);
    stream.destroy();
  }
  activeStreams.clear();

  client.destroy(() => {
    process.exit(0);
  });
});
