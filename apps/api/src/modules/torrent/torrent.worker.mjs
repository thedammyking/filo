import { parentPort } from 'worker_threads';
import WebTorrent from 'webtorrent';

// Initialize WebTorrent client
const client = new WebTorrent({
  tracker: {
    announce: ['wss://tracker.openwebtorrent.com', 'wss://tracker.btorrent.xyz']
  }
});

// Handle messages from the main thread
parentPort.on('message', async message => {
  const { type, data } = message;

  try {
    switch (type) {
      case 'ADD_TORRENT': {
        const { magnetURI, downloadPath } = data;

        // Check if torrent already exists
        const existingTorrent = client.get(magnetURI);
        if (existingTorrent) {
          parentPort.postMessage({
            type: 'TORRENT_ADDED',
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

        // Add new torrent
        client.add(magnetURI, { path: downloadPath }, torrent => {
          torrent.on('ready', () => {
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
          });

          torrent.on('error', err => {
            parentPort.postMessage({
              type: 'TORRENT_ERROR',
              data: {
                error: err.message
              }
            });
          });

          torrent.on('done', () => {
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

        // Send stream chunks to main thread
        stream.on('data', chunk => {
          parentPort.postMessage(
            {
              type: 'FILE_CHUNK',
              data: {
                infoHash,
                fileIndex,
                chunk: chunk.buffer
              }
            },
            [chunk.buffer]
          ); // Transfer the buffer to avoid copying
        });

        stream.on('end', () => {
          parentPort.postMessage({
            type: 'FILE_END',
            data: {
              infoHash,
              fileIndex
            }
          });
        });

        stream.on('error', err => {
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
  client.destroy(() => {
    process.exit(0);
  });
});
