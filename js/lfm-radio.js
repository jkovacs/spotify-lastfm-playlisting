require([
        'config#config',
        '$api/models',
        '$api/search#Search',
        '$views/image#Image',
        '$views/list#List',
        '$views/buttons'
    ], function (config, models, Search, Image, List, buttons) {
        function searchTrack(artist, track) {
            var promise = new models.Promise();
            var search = Search.search(artist + " " + track);
            search.tracks.snapshot(0, 1).done(function (result) {
                promise.setDone(result.get(0));
            }).fail(function (f) {
                promise.setFail(f);
            });
            return promise;
        }

        function startPlaylist(result) {
            var tracks = result.playlist;
            console.log("playlist:", tracks);
            // TODO: clean up temp playlist
            models.Playlist.createTemporary().done(function (playlist) {
                playlist.load('tracks').done(function (playlist) {
                    playlist.tracks.clear();
                    var trackPromises = tracks.map(function (track) {
                        return searchTrack(track.artists[0].name, track.name);
                    });
                    new models.Promise.join(trackPromises).done(function (tracks) {
                        playlist.tracks.add.apply(
                            playlist.tracks,
                            tracks.filter(function (f) { return f !== null; })
                        ).done(function () {
                            var list = List.forPlaylist(playlist);
                            $('#playlist').html(list.node);
                            list.init();

                            models.player.playContext(playlist);
                        });
                    });
                });
            });
        }

        function tune(username, station) {
            var url = 'http://www.last.fm/player/station/user/' + username + '/' + station;
            $.ajax(url).done(startPlaylist);
        }

        function startStation() {
            var username = $('#lfmUsername').val();
            var station = $('#station').val();
            createCookie('lfmUsername', username, 30);
            createCookie('station', station, 30);

            tune(username, station);
        }

        var username = readCookie('lfmUsername');
        var station = readCookie('station');
        if (username) {
            $('#lfmUsername').val(username);
        }
        if (station) {
            $('#station').val(station)
        }
        $('#tune').click(startStation);
    }
)
;
