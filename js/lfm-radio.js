require([
    'config#config',
    '$api/models',
    '$api/search#Search',
    '$views/image#Image',
    '$views/list#List',
    '$views/buttons'
    ], function(config, models, Search, Image, List, buttons) {
      var lastfm = new LastFM({
        apiKey: config.api_key,
        apiSecret: config.api_secret
      });
      var lfmSession = undefined;

      function searchTrack(artist, track) {
        var promise = new models.Promise();
        var search = Search.search(artist + " " + track);
        search.tracks.snapshot(0, 1).done(function(result) {
          promise.setDone(result.get(0));
        }).fail(function(f) {
          promise.setFail(f);
        });
        return promise;
      }

      function startPlaylist(result) {
        var tracks = result.playlist.trackList.track;
        console.log("playlist:", tracks);
        // TODO: clean up temp playlist
        models.Playlist.createTemporary().done(function(playlist) {
          playlist.load('tracks').done(function(playlist) {
            playlist.tracks.clear();
            var trackPromises = tracks.map(function (track) {
              return searchTrack(track.creator, track.title);
            });
            models.Promise.join(trackPromises).always(function(tracks) {
              console.log("tracks:", tracks);
              playlist.tracks.add.apply(
                playlist.tracks,
                tracks.filter(function(t) { return t !== null; })
              ).done(function() {
                var list = List.forPlaylist(playlist);
                $('#playlist').html(list.node);
                list.init();

                models.player.playContext(playlist);
              })
            })
          });
        });
      }

      function getPlaylist(result) {
        console.log("getting playlist for:", result.station.name);
        lastfm.radio.getPlaylist({}, lfmSession, {success: startPlaylist});
      }

      function tune(stationUrl) {
        lastfm.radio.tune({'station': stationUrl}, lfmSession, {success: getPlaylist});
      }

      function startStation() {
        if(!lfmSession) {
          var authParams = {
            'username': $('#lfmUsername').val(),
            'password': $('#lfmPassword').val()
          };
          lastfm.auth.getMobileSession(authParams, {
            success: function(result) {
              if($('#lfmSaveCredentials').prop("checked")) {
                createCookie('lfmUsername', authParams.username, 30);
                createCookie('lfmPassword', authParams.password, 30);
              } else {
                eraseCookie('lfmUsername');
                eraseCookie('lfmPassword');
              }
              // TODO: actually store the session in a cookie as well
              lfmSession = result.session;
              tune($('#stationUrl').val());
            }
          });
        } else {
          tune($('#stationUrl').val());
        }
      }

      var username = readCookie('lfmUsername');
      var password = readCookie('lfmPassword');
      if(username || password) {
        $('#lfmUsername').val(username);
        $('#lfmPassword').val(password);
        $('#lfmSaveCredentials').prop('checked', true);
      }
      $('#tune').click(startStation);
});
