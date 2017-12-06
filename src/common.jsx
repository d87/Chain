const componentToHex = function(c) {
    var hex = c.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
}

const rgbToHex = function(r, g, b) {
    r = parseInt(r, 10)
    g = parseInt(g, 10)
    b = parseInt(b, 10)
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

const mulColor = function (hex, mul) {
    // hex to rgb
    if (hex.charAt(0) === "#") 
        hex = hex.slice(1)
    var bigint = parseInt(hex, 16);
    // console.log(bigint)
    var r = (bigint >> 16) & 255;
    var g = (bigint >> 8) & 255;
    var b = bigint & 255;

    r = parseInt(r*mul, 10);
    g = parseInt(g*mul, 10);
    b = parseInt(b*mul, 10);

    return rgbToHex(r,g,b)
}
const genColor = function(hex){
    return ["#"+hex, mulColor(hex,0.4)]
}

const gray = [ 50, 50, 50 ]
const yellow = [ 200, 100, 40 ]
const red = [ 230, 50, 50 ]

const GetGradientColor = function(v){
    if (v > 1){ v = 1 }
    var c1,c2
    if (v < 0.6) {
        v = v/0.6
        c1 = gray
        c2 = yellow
    } else {
        v = (v - 0.6)/0.4
        c1 = yellow
        c2 = red
    }

    var r = c1[0] + v*(c2[0]-c1[0])
    var g = c1[1] + v*(c2[1]-c1[1])
    var b = c1[2] + v*(c2[2]-c1[2])
    return rgbToHex(r,g,b)
}

const formatTime = function(s){
    if (s >= 3600) {
        return Math.ceil(s / 3600)+"h"
    } else if (s >= 60) {
        return Math.ceil(s / 60)+"m"
    } else if (s >= 10) {
        return Math.floor(s)+"s"
    }
    return s.toFixed(1)
}

const formatTime2 = function(s){

    let h = Math.floor(s / 3600)
    s = s - h*3600
    if (h >= 24) h = h - 24
    const m =  Math.floor(s / 60)
    const zerofill = ('00'+m).slice(-2);
    return h+":"+zerofill
}

class MiniDaemon {
    constructor(oOwner, fTask, nRate, nLen) {
      // if (!(this && this instanceof MiniDaemon)) { return; }
      if (arguments.length < 2) { throw new TypeError("MiniDaemon - not enough arguments"); }
      if (oOwner) { this.owner = oOwner; }
      this.task = fTask;
      if (isFinite(nRate) && nRate > 0) { this.rate = Math.floor(nRate); }
      if (nLen > 0) { this.length = Math.floor(nLen); }
    }
 
    owner = null;
    task = null;
    rate = 100;
    length = Infinity;
    SESSION = -1;
    INDEX = 0;
    PAUSED = true;
    BACKW = true;

    static forceCall (oDmn) {
      oDmn.INDEX += oDmn.BACKW ? -1 : 1;
      if (oDmn.task.call(oDmn.owner, oDmn.INDEX, oDmn.length, oDmn.BACKW) === false || oDmn.isAtEnd()) { oDmn.pause(); return false; }
      return true;
    };
 
    isAtEnd() {
      return this.BACKW ? isFinite(this.length) && this.INDEX < 1 : this.INDEX + 1 > this.length;
    };
     
    synchronize() {
      if (this.PAUSED) { return; }
      clearInterval(this.SESSION);
      // this.SESSION = this.owner.setInterval(this.task, this.rate);
      this.SESSION = setInterval(MiniDaemon.forceCall, this.rate, this);
    };
     
    pause() {
      clearInterval(this.SESSION);
      this.PAUSED = true;
    };
     
    start(bReverse) {
      var bBackw = Boolean(bReverse);
      if (this.BACKW === bBackw && (this.isAtEnd() || !this.PAUSED)) { return; }
      this.BACKW = bBackw;
      this.PAUSED = false;
      this.synchronize();
    };

    isActive() {
        return (!this.PAUSED)
    };

    resume() {
        if (!this.isActive()) this.start()
    }
}


export { componentToHex, rgbToHex, mulColor, genColor, GetGradientColor, formatTime, formatTime2, MiniDaemon }