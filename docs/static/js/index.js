window.HELP_IMPROVE_VIDEOJS = false;
document.documentElement.classList.add('js');

$(document).ready(function() {
    // Check for click events on the navbar burger icon
    $(".navbar-burger").click(function() {
      // Toggle the "is-active" class on both the "navbar-burger" and the "navbar-menu"
      $(".navbar-burger").toggleClass("is-active");
      $(".navbar-menu").toggleClass("is-active");
    });

    bulmaSlider.attach();

    // Scene tabs: one clip at a time, static/videos/flight_<scene>.{mp4,jpg}
    // On a phone the scene pills become one dropdown, built from the pills.
    var $sel = $('<select id="scene-select" aria-label="Scene"></select>');
    $(".scene-tabs").each(function() {
      var $g = $('<optgroup></optgroup>').attr("label", $(this).prev(".tab-group-label").text());
      $(this).find("li").each(function() { $g.append($("<option></option>").val($(this).data("scene")).text($(this).text())); });
      $sel.append($g);
    });
    $('<div class="scene-select-wrap"><div class="select is-rounded"></div></div>').insertBefore($(".tab-group-label").first()).find(".select").append($sel);
    $("#videos").addClass("has-select");
    $sel.on("change", function() { $('.scene-tabs li[data-scene="' + this.value + '"]').trigger("click"); });

    $(".scene-tabs li").click(function() {
      var scene = $(this).data("scene"), v = $("#flight")[0];
      $sel.val(scene);
      $(".scene-tabs li").removeClass("is-active");
      $(this).addClass("is-active");
      v.poster = "./static/videos/flight_" + scene + ".jpg";
      $("#flight source").attr("src", "./static/videos/flight_" + scene + ".mp4");
      $("#flight-note").text($(this).data("set") === "CL-Splats" ? "CL-Splats, FastPGSR, seed 22." : "PASLCD, FastPGSR, seed 22.");
      v.load(); v.play();
    });
});

// Scroll reveal, nav shadow and current-section highlight
$(document).ready(function() {
    var reveal = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function(entries) {
        entries.forEach(function(e) { if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); } });
      }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
      reveal.forEach(function(el) { io.observe(el); });
    } else { reveal.forEach(function(el) { el.classList.add('is-visible'); }); }

    var nav = document.querySelector('.site-nav'), links = document.querySelectorAll('.site-nav .navbar-end a');
    function onScroll() { nav.classList.toggle('is-scrolled', window.scrollY > 8); if (window.scrollY < 120) links.forEach(function(a) { a.classList.remove('is-current'); }); }
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
    if ('IntersectionObserver' in window) {
      var cur = new IntersectionObserver(function(entries) {
        entries.forEach(function(e) {
          if (e.isIntersecting) links.forEach(function(a) { a.classList.toggle('is-current', a.getAttribute('href') === '#' + e.target.id); });
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      links.forEach(function(a) { var t = document.querySelector(a.getAttribute('href')); if (t) cur.observe(t); });
    }
    // close the mobile menu after choosing a section
    links.forEach(function(a) { a.addEventListener('click', function() { $('.navbar-burger, .navbar-menu').removeClass('is-active'); }); });
});

// IDE-style JSON window: syntax colours, bracket colours by depth, line numbers, copy button
$(document).ready(function() {
    var code = document.getElementById('pool-json');
    if (!code) return;
    var src = code.textContent, depth = 0, out = document.createDocumentFragment();
    var re = /("(?:[^"\\]|\\.)*")(\s*:)?|(-?\d+\.?\d*(?:[eE][+-]?\d+)?)|\b(true|false|null)\b|([{}\[\]])|([,:])|(\s+)|(.)/g;
    function span(cls, text) { var s = document.createElement('span'); if (cls) s.className = cls; s.textContent = text; return s; }
    src.split('\n').forEach(function(line) {
      var row = document.createElement('span'); row.className = 'cl'; var m; re.lastIndex = 0;
      while ((m = re.exec(line)) !== null) {
        if (m[1] !== undefined) { if (m[2]) { row.appendChild(span('tk-key', m[1])); row.appendChild(span('tk-p', m[2])); } else row.appendChild(span('tk-str', m[1])); }
        else if (m[3] !== undefined) row.appendChild(span('tk-num', m[3]));
        else if (m[4] !== undefined) row.appendChild(span('tk-lit', m[4]));
        else if (m[5] !== undefined) {
          if (m[5] === '{' || m[5] === '[') { row.appendChild(span('tk-b' + (depth % 3), m[5])); depth++; }
          else { depth = Math.max(0, depth - 1); row.appendChild(span('tk-b' + (depth % 3), m[5])); }
        }
        else row.appendChild(span(m[6] ? 'tk-p' : '', m[0]));
      }
      if (!line) row.appendChild(document.createTextNode(' '));
      out.appendChild(row);
    });
    code.textContent = ''; code.appendChild(out);
    var btn = document.querySelector('.ide-copy');
    if (btn) btn.addEventListener('click', function() {
      var done = function() { btn.textContent = 'Copied'; btn.classList.add('is-done'); setTimeout(function() { btn.textContent = 'Copy'; btn.classList.remove('is-done'); }, 1600); };
      if (navigator.clipboard) navigator.clipboard.writeText(src).then(done, done); else done();
    });
});

// Flythrough on a phone: one video, three canvases. Each canvas shows one third of the frame (T1, T2, changes).
$(document).ready(function() {
    var mq = window.matchMedia('(max-width: 767px)'), video = document.getElementById('flight'), wrap = video && video.parentElement;
    if (!video) return;
    var stack = null, ctx = [], running = false;
    function build() {
      var names = ['T1', 'T2', 'Changes'];
      stack = $('<div class="flight-stack" aria-hidden="true"></div>');
      for (var k = 0; k < 3; k++) {
        var cv = $('<canvas width="512" height="288"></canvas>'), fig = $('<figure></figure>').toggleClass('is-wide', k === 2);
        fig.append(cv).append($('<figcaption></figcaption>').text(names[k])); stack.append(fig); ctx.push(cv[0].getContext('2d'));
      }
      $(wrap).append(stack);
    }
    function draw() {
      if (!running) return;
      if (video.readyState >= 2 && video.videoWidth) {
        var w = video.videoWidth / 3, h = video.videoHeight;
        for (var k = 0; k < 3; k++) ctx[k].drawImage(video, k * w, 0, w, h, 0, 0, 512, 288);
      }
      requestAnimationFrame(draw);
    }
    function apply() {
      if (mq.matches) {
        if (!stack) build();
        wrap.classList.add('is-stacked'); running = true; video.play(); draw();
      } else { running = false; wrap.classList.remove('is-stacked'); }
    }
    mq.addEventListener ? mq.addEventListener('change', apply) : mq.addListener(apply);
    apply();
});
