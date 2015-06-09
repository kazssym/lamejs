require('use-strict');

assert = console.assert;
fs = require('fs');
var common = require('./common.js');
var System = common.System;
var VbrMode = common.VbrMode;
var Float = common.Float;
var ShortBlock = common.ShortBlock;
var Util = common.Util;
var Arrays = common.Arrays;
var new_array_n = common.new_array_n;
var new_byte = common.new_byte;
var new_double = common.new_double;
var new_float = common.new_float;
var new_float_n = common.new_float_n;
var new_int = common.new_int;
var new_int_n = common.new_int_n;

Lame = require('./Lame.js');
Presets = require('./Presets.js');
GainAnalysis = require('./GainAnalysis.js');
QuantizePVT = require('./QuantizePVT.js');
Quantize = require('./Quantize.js');
Takehiro = require('./Takehiro.js');
Reservoir = require('./Reservoir.js');
MPEGMode = require('./MPEGMode.js');
BitStream = require('./BitStream.js');
var Encoder = require('./Encoder.js');
var Version = require('./Version.js');
var VBRTag = require('./VBRTag.js');

function GetAudio() {
    var parse;
    var mpg;

    this.setModules = function (parse2, mpg2) {
        parse = parse2;
        mpg = mpg2;
    }
}


function Parse() {
    var ver;
    var id3;
    var pre;

    this.setModules = function (ver2, id32, pre2) {
        ver = ver2;
        id3 = id32;
        pre = pre2;
    }
}

function BRHist() {
    console.log("TODO: BRHist");
}
function MPGLib() {
    console.log("TODO: MPGLib");
}

function ID3Tag() {
    var bits;
    var ver;

    this.setModules = function (_bits, _ver) {
        bits = _bits;
        ver = _ver;
    }
}

function LameEncoder(channels, samplerate, kbps) {
    var lame = new Lame();
    var gaud = new GetAudio();
    var ga = new GainAnalysis();
    var bs = new BitStream();
    var p = new Presets();
    var qupvt = new QuantizePVT();
    var qu = new Quantize();
    var vbr = new VBRTag();
    var ver = new Version();
    var id3 = new ID3Tag();
    var rv = new Reservoir();
    var tak = new Takehiro();
    var parse = new Parse();
    var mpg = new MPGLib();

    lame.setModules(ga, bs, p, qupvt, qu, vbr, ver, id3, mpg);
    bs.setModules(ga, mpg, ver, vbr);
    id3.setModules(bs, ver);
    p.setModules(lame);
    qu.setModules(bs, rv, qupvt, tak);
    qupvt.setModules(tak, rv, lame.enc.psy);
    rv.setModules(bs);
    tak.setModules(qupvt);
    vbr.setModules(lame, bs, ver);
    gaud.setModules(parse, mpg);
    parse.setModules(ver, id3, p);

    var gfp = lame.lame_init();

    gfp.num_channels = channels;
    gfp.in_samplerate = samplerate;
    gfp.brate = kbps;
    gfp.mode = MPEGMode.STEREO;
    gfp.quality = 3;
    gfp.bWriteVbrTag = false;
    gfp.disable_reservoir = true;
    gfp.write_id3tag_automatic = false;

    var retcode = lame.lame_init_params(gfp);
    assert(0 == retcode);

    this.encodeBuffer = function (left, right, nsamples, mp3buf, mp3bufPos, mp3buf_size) {
        var _sz = lame.lame_encode_buffer(gfp, left, right, nsamples, mp3buf, mp3bufPos, mp3buf_size);
        return _sz;
    }

    this.flush = function (mp3buf, mp3bufPos, mp3buf_size) {
        var _sz = lame.lame_encode_flush(gfp, mp3buf, mp3bufPos, mp3buf_size);
        return _sz;
    }
}

var r = fs.readFileSync("/Users/zhukov/Desktop/IMG_0373.wav");
var sampleBuf = new Uint8Array(r).buffer;
var samples = new Int16Array(sampleBuf, 0x70, 0xB2E800 / 2);
var remaining = samples.length;
var lameEnc = new LameEncoder(1, 44100, 128);
var maxSamples = 1152;
var mp3buf_size = 0 | (1.25 * maxSamples + 7200);
var mp3buf = new_byte(mp3buf_size);
var mp3bufPos = 0;
//FileOutputStream out = new FileOutputStream(new File("testjava2.mp3"));
var fd = fs.openSync("testjs2.mp3", "w");
var time = new Date().getTime();
for (var i = 0; remaining >= maxSamples; i += maxSamples) {
    var left = samples.subarray(i, i + maxSamples);
    var right = samples.subarray(i, i + maxSamples);

    var _sz = lameEnc.encodeBuffer(left, right, maxSamples, mp3buf, mp3bufPos, mp3buf_size);
    if (_sz > 0) {
        var _buf = new Buffer(mp3buf, 0, _sz);
        fs.writeSync(fd, _buf, 0, _sz);
    }
    remaining -= maxSamples;

}
var _sz = lameEnc.flush(mp3buf, mp3bufPos, mp3buf_size);
fs.writeSync(fd, new Buffer(mp3buf, 0, _sz), 0, _sz);
fs.closeSync(fd);
time = new Date().getTime() - time;
console.log('done in ' + time + 'msec');


/*
 var r = fs.readFileSync('/Users/zhukov/git/tle1.3x/test-data/wav/440880.wav');
 sampleBuf = new Uint8Array(r).buffer;
 var dataLen = new DataView(sampleBuf).getInt32(0x28, true);
 console.log(dataLen);
 samples = new Int16Array(sampleBuf, 0x2c, dataLen / 2);
 assert(samples[1] == 0x05e6);
 console.log(samples.length);

 var remaining = samples.length;
 var left = new Int16Array(samples);
 var right = new Int16Array(samples);
 var mp3buf_size = 0 | (1.25 * remaining + 7200);
 var mp3buf = new Int8Array(mp3buf_size);
 var mp3bufPos = 0;
 var _sz = lame.lame_encode_buffer(gfp, left, right, remaining,
 mp3buf, mp3bufPos, mp3buf_size);
 console.log("lame_encode_buffer: " + _sz);
 for (var i = 0; i < _sz; i++) {
 console.log(mp3buf[i]);
 }

 fs.writeFileSync("testjs.mp3", new Buffer(new Int8Array(mp3buf.buffer, 0, _sz)));

 _sz = lame.lame_encode_flush(gfp, mp3buf, mp3bufPos, mp3buf_size);
 console.log("lame_encode_flush: " + _sz);
 fs.appendFileSync("testjs.mp3", new Buffer(new Int8Array(mp3buf.buffer, 0, _sz)));
 */
