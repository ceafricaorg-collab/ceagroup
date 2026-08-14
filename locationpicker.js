(function () {
  var DEFAULT_CENTER = { lat: 9.082, lng: 8.6753 };
  var map, marker;

  function setPin(lat, lng) {
    var pos = { lat: lat, lng: lng };
    if (!marker) {
      marker = new google.maps.Marker({
        position: pos,
        map: map,
        draggable: true,
        optimized: false,
        animation: google.maps.Animation.DROP,
      });
      marker.addListener("dragend", function () {
        var p = marker.getPosition();
        updateFields(p.lat(), p.lng());
      });
    } else {
      marker.setPosition(pos);
      map.panTo(pos);
    }
    updateFields(lat, lng);
  }

  function updateFields(lat, lng) {
    var latInput = document.getElementById("latitude");
    var lngInput = document.getElementById("longitude");
    var status = document.getElementById("locationStatus");
    if (latInput) latInput.value = lat;
    if (lngInput) lngInput.value = lng;
    if (status) {
      status.textContent = "Pin set at " + lat.toFixed(6) + ", " + lng.toFixed(6);
      status.style.color = "var(--cea-green)";
    }
    var group = document.getElementById("group-location");
    if (group) group.classList.remove("has-error");
  }

  // Called by Google Maps SDK once the API has loaded.
  // By this point the map container is guaranteed visible (step2 was revealed before this script loaded).
  window.initLocationMap = function () {
    var mapEl = document.getElementById("locationMap");
    if (!mapEl) return;

    map = new google.maps.Map(mapEl, {
      center: DEFAULT_CENTER,
      zoom: 6,
      gestureHandling: "greedy",
    });

    map.addListener("click", function (e) {
      setPin(e.latLng.lat(), e.latLng.lng());
    });

    var btn = document.getElementById("useMyLocationBtn");
    if (btn) {
      btn.addEventListener("click", function () {
        if (!navigator.geolocation) {
          var s = document.getElementById("locationStatus");
          if (s) s.textContent = "Geolocation is not supported by your browser.";
          return;
        }
        navigator.geolocation.getCurrentPosition(
          function (pos) { map.setZoom(16); setPin(pos.coords.latitude, pos.coords.longitude); },
          function () {
            var s = document.getElementById("locationStatus");
            if (s) s.textContent = "Couldn't get your location. Please drop a pin manually.";
          }
        );
      });
    }
  };

  // No-op kept for backwards compatibility — not needed with dynamic loading.
  window.ceaShowMap = function () {};
})();
