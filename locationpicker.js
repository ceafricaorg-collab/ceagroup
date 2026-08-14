(function () {
  var DEFAULT_CENTER = { lat: 9.082, lng: 8.6753 };
  var map, marker;
  var mapsApiReady = false;
  var mapInitialized = false;

  function setPin(lat, lng) {
    if (!map) return;
    var pos = { lat: lat, lng: lng };
    if (!marker) {
      marker = new google.maps.Marker({
        position: pos,
        map: map,
        draggable: true,
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

  // Google Maps API ready — store flag only. Do NOT init here:
  // the map container is display:none at page load, creating a broken zero-size instance.
  window.initLocationMap = function () {
    mapsApiReady = true;
  };

  // Called by listingform.js 300ms after step-2 becomes visible.
  // By this point the container has real pixel dimensions.
  window.ceaShowMap = function () {
    if (mapInitialized || !mapsApiReady) return;
    mapInitialized = true;

    var mapEl = document.getElementById("locationMap");
    if (!mapEl) return;

    // Ensure no parent CSS is swallowing pointer events or clipping markers
    mapEl.style.pointerEvents = "auto";
    mapEl.style.position = "relative";
    mapEl.style.overflow = "hidden";
    mapEl.style.zIndex = "0";
    if (mapEl.parentElement) mapEl.parentElement.style.overflow = "visible";

    map = new google.maps.Map(mapEl, {
      center: DEFAULT_CENTER,
      zoom: 6,
      gestureHandling: "greedy",
    });

    map.addListener("click", function (e) {
      setPin(e.latLng.lat(), e.latLng.lng());
    });

    var useMyLocationBtn = document.getElementById("useMyLocationBtn");
    if (useMyLocationBtn) {
      useMyLocationBtn.addEventListener("click", function () {
        if (!navigator.geolocation) {
          var s = document.getElementById("locationStatus");
          if (s) s.textContent = "Geolocation is not supported by your browser.";
          return;
        }
        navigator.geolocation.getCurrentPosition(
          function (pos) {
            map.setZoom(16);
            setPin(pos.coords.latitude, pos.coords.longitude);
          },
          function () {
            var s = document.getElementById("locationStatus");
            if (s) s.textContent = "Couldn't get your location. Please drop a pin manually.";
          }
        );
      });
    }
  };
})();
