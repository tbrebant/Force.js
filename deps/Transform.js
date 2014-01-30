// By Simon Sarris
// www.simonsarris.com
// sarris@acm.org
//
// Slightly modified by Tabletop Pixel (added `getInvert` and `worldToLocal`)
// 
// Free to use and distribute at will
// So long as you are nice to people, etc

// Simple class for keeping track of the current transformation matrix

// For instance:
//    var t = new Transform();
//    t.rotate(5);
//    var m = t.m;
//    ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);

// Is equivalent to:
//    ctx.rotate(5);

// But now you can retrieve it :)

// Remember that this does not account for any CSS transforms applied to the canvas

(function () {

	function Transform() {
		this.reset();
	}
	window.Transform = Transform;
	
	var degToRad = Math.PI / 180;
	
	Transform.prototype.reset = function() {
		if(!this.m) {
			this.m = new Array(6);
		}
		this.m[0] = 1;
		this.m[1] = 0;
		this.m[2] = 0;
		this.m[3] = 1;
		this.m[4] = 0;
		this.m[5] = 0;
	};
	
	Transform.prototype.multiply = function(matrix) {
		var m11 = this.m[0] * matrix.m[0] + this.m[2] * matrix.m[1];
		var m12 = this.m[1] * matrix.m[0] + this.m[3] * matrix.m[1];
		
		var m21 = this.m[0] * matrix.m[2] + this.m[2] * matrix.m[3];
		var m22 = this.m[1] * matrix.m[2] + this.m[3] * matrix.m[3];
		
		var dx = this.m[0] * matrix.m[4] + this.m[2] * matrix.m[5] + this.m[4];
		var dy = this.m[1] * matrix.m[4] + this.m[3] * matrix.m[5] + this.m[5];
		
		this.m[0] = m11;
		this.m[1] = m12;
		this.m[2] = m21;
		this.m[3] = m22;
		this.m[4] = dx;
		this.m[5] = dy;
	};
	
	Transform.prototype.invert = function() {
		var d = 1 / (this.m[0] * this.m[3] - this.m[1] * this.m[2]);
		var m0 = this.m[3] * d;
		var m1 = -this.m[1] * d;
		var m2 = -this.m[2] * d;
		var m3 = this.m[0] * d;
		var m4 = d * (this.m[2] * this.m[5] - this.m[3] * this.m[4]);
		var m5 = d * (this.m[1] * this.m[4] - this.m[0] * this.m[5]);
		this.m[0] = m0;
		this.m[1] = m1;
		this.m[2] = m2;
		this.m[3] = m3;
		this.m[4] = m4;
		this.m[5] = m5;
	};
	
	Transform.prototype.getInvert = function() {
		var d = 1 / (this.m[0] * this.m[3] - this.m[1] * this.m[2]);
		var m0 = this.m[3] * d;
		var m1 = -this.m[1] * d;
		var m2 = -this.m[2] * d;
		var m3 = this.m[0] * d;
		var m4 = d * (this.m[2] * this.m[5] - this.m[3] * this.m[4]);
		var m5 = d * (this.m[1] * this.m[4] - this.m[0] * this.m[5]);
		return [m0, m1, m2, m3, m4, m5];
	};
	
	Transform.prototype.rotate = function(deg) {
		var rad = deg * degToRad;
		var c = Math.cos(rad);
		var s = Math.sin(rad);
		var m11 = this.m[0] * c + this.m[2] * s;
		var m12 = this.m[1] * c + this.m[3] * s;
		var m21 = this.m[0] * -s + this.m[2] * c;
		var m22 = this.m[1] * -s + this.m[3] * c;
		this.m[0] = m11;
		this.m[1] = m12;
		this.m[2] = m21;
		this.m[3] = m22;
	};
	
	Transform.prototype.translate = function(x, y) {
		this.m[4] += this.m[0] * x + this.m[2] * y;
		this.m[5] += this.m[1] * x + this.m[3] * y;
	};
	
	Transform.prototype.scale = function(sx, sy) {
		this.m[0] *= sx;
		this.m[1] *= sx;
		this.m[2] *= sy;
		this.m[3] *= sy;
	};
	
	Transform.prototype.localToWorld = function(x, y) {
		return [
			x * this.m[0] + y * this.m[2] + this.m[4], // x
			x * this.m[1] + y * this.m[3] + this.m[5]  // y
		];
	};
	
	Transform.prototype.worldToLocal = function(x, y) {
		var inv = this.getInvert();
		return [
			x * inv[0] + y * inv[2] + inv[4], // x
			x * inv[1] + y * inv[3] + inv[5]  // y
		];
	};
})();