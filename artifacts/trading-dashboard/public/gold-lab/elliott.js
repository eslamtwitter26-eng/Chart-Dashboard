(function (root) {
  "use strict";

  // Ordinary impulses and simple zigzag corrections only; no diagonals,
  // truncated fifths, forecasts, or claims of a unique Elliott interpretation.
  function detect(input, depth) {
    depth = [3, 5, 8].indexOf(Number(depth)) >= 0 ? Number(depth) : 3;
    var bars = input.filter(function (b) { return b.closed === true; }).slice(-2000);
    var pivots = [];
    for (var i = depth; i < bars.length - depth; i++) {
      var b = bars[i], high = true, low = true;
      for (var k = 1; k <= depth; k++) {
        high = high && b.high > bars[i - k].high && b.high > bars[i + k].high;
        low = low && b.low < bars[i - k].low && b.low < bars[i + k].low;
      }
      // An outside bar can be both extremes; OHLC cannot establish their order.
      if (high === low) continue;
      var p = { time: b.time, price: high ? b.high : b.low, type: high ? "H" : "L",
        confirmedAt: bars[i + depth].time };
      var last = pivots[pivots.length - 1];
      if (last && last.type === p.type) {
        if (p.type === "H" ? p.price > last.price : p.price < last.price) pivots[pivots.length - 1] = p;
      } else pivots.push(p);
    }

    var candidates = [];
    for (var s = 0; s + 5 < pivots.length; s++) {
      var points = pivots.slice(s, s + 6);
      var direction = points[0].type === "L" ? 1 : -1;
      var v = points.map(function (p) { return direction * p.price; });
      var w1 = v[1] - v[0], w3 = v[3] - v[2], w5 = v[5] - v[4];
      if (!(v[2] > v[0] && v[2] < v[1] && v[3] > v[1] &&
          v[4] > v[1] && v[4] < v[3] && v[5] > v[3] &&
          w3 + 1e-9 >= Math.min(w1, w5))) continue;
      var labels = ["0", "1", "2", "3", "4", "5"];
      // A/B/C are drawn only as each additional pivot becomes confirmed.
      var a = pivots[s + 6], bb = pivots[s + 7], c = pivots[s + 8];
      if (a && direction * a.price < v[5]) {
        points.push(a); labels.push("A");
        if (bb && direction * bb.price > direction * a.price && direction * bb.price < v[5]) {
          points.push(bb); labels.push("B");
          if (c && direction * c.price < direction * a.price) { points.push(c); labels.push("C"); }
        }
      }
      candidates.push({ direction: direction, points: points, labels: labels,
        wave2Retracement: (v[1] - v[2]) / w1, wave3Extension: w3 / w1 });
    }
    // Avoid several overlapping counts being presented as one definite count.
    var patterns = [], boundary = Infinity;
    for (var j = candidates.length - 1; j >= 0 && patterns.length < 3; j--) {
      var candidate = candidates[j];
      if (candidate.points[candidate.points.length - 1].time > boundary) continue;
      patterns.unshift(candidate);
      boundary = candidate.points[0].time;
    }
    return { patterns: patterns, pivots: pivots, closedBars: bars.length, depth: depth };
  }

  function draw(canvas, chart, series, model) {
    var ctx = canvas.getContext("2d"), dpr = root.devicePixelRatio || 1;
    var w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    if (!model) return;
    var right = w - chart.priceScale("right").width(), bottom = h - chart.timeScale().height();
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, right, bottom); ctx.clip();
    ctx.font = "600 12px IBM Plex Mono, monospace"; ctx.direction = "ltr";
    function location(p) {
      var x = chart.timeScale().timeToCoordinate(p.time), y = series.priceToCoordinate(p.price);
      return x == null || y == null ? null : { x: x, y: y };
    }
    {
      // Recent unnumbered swings remain visible even when the last qualifying
      // numbered pattern is historical and outside the current viewport.
      ctx.strokeStyle = "rgba(143,136,115,0.55)"; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
      ctx.beginPath();
      model.pivots.slice(-30).forEach(function (p, i) {
        var xy = location(p); if (!xy) return;
        if (i === 0) ctx.moveTo(xy.x, xy.y); else ctx.lineTo(xy.x, xy.y);
      });
      ctx.stroke(); ctx.setLineDash([]);
    }
    model.patterns.forEach(function (pattern) {
      pattern.points.forEach(function (p, i) {
        var xy = location(p); if (!xy) return;
        var color = i > 5 ? "#c084fc" : pattern.direction === 1 ? "#5aa9e6" : "#f0b35e";
        if (i > 0) {
          var previous = location(pattern.points[i - 1]);
          if (previous) {
            ctx.strokeStyle = color; ctx.lineWidth = 2;
            ctx.setLineDash(i > 5 ? [5, 3] : []);
            ctx.beginPath(); ctx.moveTo(previous.x, previous.y); ctx.lineTo(xy.x, xy.y); ctx.stroke();
          }
        }
        ctx.setLineDash([]);
        if (xy.x < 0 || xy.x > right || xy.y < 0 || xy.y > bottom) return;
        ctx.fillStyle = color; ctx.beginPath(); ctx.arc(xy.x, xy.y, 3, 0, Math.PI * 2); ctx.fill();
        var labelY = Math.max(16, Math.min(bottom - 5, xy.y + (p.type === "H" ? -13 : 22)));
        ctx.fillStyle = "#15130e"; ctx.fillRect(xy.x - 9, labelY - 12, 18, 17);
        ctx.fillStyle = color; ctx.textAlign = "center"; ctx.fillText(pattern.labels[i], xy.x, labelY);
      });
    });
    ctx.restore();
  }

  var api = { detect: detect, draw: draw };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.GoldElliott = api;
})(typeof window !== "undefined" ? window : globalThis);
