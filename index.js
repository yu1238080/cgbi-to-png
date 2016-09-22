// Generated by CoffeeScript 1.10.0
(function() {
  var PNGHEADER_BASE64, bufferpack, crc, ignoreChunkTypes, revertCgBIBuffer, streamToBuffer, streamifier, zlib,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  streamToBuffer = require('stream-to-buffer');

  bufferpack = require('bufferpack');

  streamifier = require('streamifier');

  zlib = require('zlib');

  crc = require('crc');

  PNGHEADER_BASE64 = 'iVBORw0KGgo=';

  ignoreChunkTypes = ['CgBI', 'iDOT'];

  module.exports = function(stream, callback) {
    return streamToBuffer(stream, function(err, buffer) {
      var output;
      if (err) {
        return callback(err);
      }
      output = revertCgBIBuffer(buffer);
      return callback(null, streamifier.createReadStream(output));
    });
  };

  module.exports.revert = revertCgBIBuffer = function(buffer) {
    var chunk, chunkCRC, chunks, data, dataCrc, headerData, height, i, idatCgbiData, idatData, idat_chunk, isIphoneCompressed, j, k, l, len, newData, offset, output, ref, ref1, ref2, uncompressed, width, x, y;
    isIphoneCompressed = false;
    offset = 0;
    chunks = [];
    idatCgbiData = new Buffer(0);
    headerData = buffer.slice(0, 8);
    offset += 8;
    if (headerData.toString('base64') !== PNGHEADER_BASE64) {
      return callback(new Error('not a png file'));
    }
    while (offset < buffer.length) {
      chunk = {};
      data = buffer.slice(offset, offset + 4);
      offset += 4;
      chunk.length = bufferpack.unpack("L>", data, 0)[0];
      data = buffer.slice(offset, offset + 4);
      offset += 4;
      chunk.type = data.toString();
      chunk.data = data = buffer.slice(offset, offset + chunk.length);
      offset += chunk.length;
      dataCrc = buffer.slice(offset, offset + 4);
      offset += 4;
      chunk.crc = bufferpack.unpack("L>", dataCrc, 0)[0];
      if (chunk.type === 'CgBI') {
        isIphoneCompressed = true;
      }
      if (ref = chunk.type, indexOf.call(ignoreChunkTypes, ref) >= 0) {
        continue;
      }
      if (chunk.type === 'IHDR') {
        width = bufferpack.unpack('L>', data)[0];
        height = bufferpack.unpack('L>', data, 4)[0];
      }
      if (chunk.type === 'IDAT') {
        idatCgbiData = Buffer.concat([idatCgbiData, data]);
        continue;
      }
      if (chunk.type === 'IEND' && isIphoneCompressed) {
        uncompressed = zlib.inflateRawSync(idatCgbiData);
        newData = new Buffer(uncompressed.length);
        i = 0;
        for (y = j = 0, ref1 = height - 1; 0 <= ref1 ? j <= ref1 : j >= ref1; y = 0 <= ref1 ? ++j : --j) {
          newData[i] = uncompressed[i];
          i++;
          for (x = k = 0, ref2 = width - 1; 0 <= ref2 ? k <= ref2 : k >= ref2; x = 0 <= ref2 ? ++k : --k) {
            newData[i + 0] = uncompressed[i + 2];
            newData[i + 1] = uncompressed[i + 1];
            newData[i + 2] = uncompressed[i + 0];
            newData[i + 3] = uncompressed[i + 3];
            i += 4;
          }
        }
        idatData = zlib.deflateSync(newData);
        chunkCRC = crc.crc32('IDAT' + idatData);
        chunkCRC = (chunkCRC + 0x100000000) % 0x100000000;
        console.log(chunkCRC, '....');
        idat_chunk = {
          'type': 'IDAT',
          'length': idatData.length,
          'data': idatData,
          'crc': 123
        };
        chunks.push(idat_chunk);
      }
      chunks.push(chunk);
    }
    output = headerData;
    for (l = 0, len = chunks.length; l < len; l++) {
      chunk = chunks[l];
      output = Buffer.concat([output, bufferpack.pack('L>', [chunk.length])]);
      output = Buffer.concat([output, new Buffer(chunk.type)]);
      if (chunk.length > 0) {
        output = Buffer.concat([output, new Buffer(chunk.data)]);
      }
      output = Buffer.concat([output, bufferpack.pack('L>', [chunk.crc])]);
    }
    return output;
  };

}).call(this);
