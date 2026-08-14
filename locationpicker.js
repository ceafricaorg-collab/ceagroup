(function () {
  var DEFAULT_CENTER = { lat: 9.082, lng: 8.6753 }; // Nigeria, roughly centered
  var map, marker;
  var mapsApiReady = false;
  var mapInitialized = false;

  function setPin(lat, lng) {
    var pos = { lat: lat, lng: lng };
    if (!marker) {
      marker = new google.maps.Marker({ position: pos, map: map, draggable: true });
      marker.addListener("dragend", function () {
        var p = marker.getPosition();
        updateFields(p.lat(), p.lng());
      });
    } else {
      marker.setPosition(pos);
    }
    map.panTo(pos);
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

  function doInitMap() {
    if (mapInitialized || !mapsApiReady) return;
    var mapEl = document.getElementById("locationMap");
    if (!mapEl) return;
    mapInitialized = true;

    map = new google.maps.Map(mapEl, { center: DEFAULT_CENTER, zoom: 6 });

    map.addListener("click", function (e) {
      setPin(e.latLng.lat(), e.latLng.lng());
    });

    var useMyLocationBtn = document.getElementById("useMyLocationBtn");
    if (useMyLocationBtn) {
      useMyLocationBtn.addEventListener("click", function () {
        if (!navigator.geolocation) {
          var status = document.getElementById("locationStatus");
          if (status) status.textContent = "Geolocation is not supported by your browser.";
          return;
        }
        navigator.geolocation.getCurrentPosition(
          function (position) {
            map.setZoom(16);
            setPin(position.coords.latitude, position.coords.longitude);
          },
          function () {
            var status = document.getElementById("locationStatus");
            if (status) status.textContent = "Couldn't get your location. Please drop a pin manually.";
          }
        );
      });
    }
  }

  // Called by Google Maps SDK when it has loaded.
  // Do NOT init here if the container is hidden — init lazily via ceaShowMap instead.
  window.initLocationMap = function () {
    mapsApiReady = true;
    // Only init now if step 2 is already visible (handles slow network / fast reveal race)
    var mapEl = document.getElementById("locationMap");
    if (mapEl && mapEl.offsetParent !== null) {
      doInitMap();
    }
  };

  // Called by listingform.js after the step-2 container becomes visible.
  // If Maps API isn't ready yet, doInitMap will run from initLocationMap when it fires.
  window.ceaShowMap = function () {
    if (mapsApiReady) {
      doInitMap();
    }
    // else: initLocationMap will call doInitMap once the API arrives
  };
})();
