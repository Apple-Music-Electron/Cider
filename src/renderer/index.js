Vue.use(VueObserveVisibility);

// This is going to suck to code
var CiderContextMenu = {
    Menu: function (event) {
        this.items = []
    },
    async Create(event, menudata) {
        var menuBackground = document.createElement("div");
        var menu = document.createElement("div");
        menu.classList.add("context-menu-body");
        menu.classList.add("context-menu-open");
        menuBackground.classList.add("context-menu");
        menu.style.left = 0 + "px";
        menu.style.top = 0 + "px";
        menu.style.position = "absolute";
        menu.style.zIndex = "99909";
        menu.addEventListener("animationend", function () {
            menu.classList.remove("context-menu-open");
        }, {once: true});

        function close() {
            menuBackground.style.pointerEvents = "none";
            menu.classList.add("context-menu-close");
            menu.addEventListener("animationend", function () {
                menuBackground.remove();
                menu.remove();
            }, {once: true});
        }

        // when menubackground is clicked, remove it
        menuBackground.addEventListener("click", close);
        menuBackground.addEventListener("contextmenu", close);

        // add menu to menuBackground
        menuBackground.appendChild(menu);

        document.body.appendChild(menuBackground);

        if (typeof menudata.items == "object") {
            menudata.items = Object.values(menudata.items);
        }

        console.log(menudata);

        // for each item in menudata create a menu item
        for (var i = 0; i < menudata.items.length; i++) {
            let item = document.createElement("button")

            if (menudata.items[i]["disabled"] === true) {
                continue
            }
            item.tabIndex = 0
            item.classList.add("context-menu-item")
            if(menudata.items[i]["icon"]) {
                item.innerHTML += `<div class="sidebar-icon">${await app.getSvgIcon(menudata.items[i]["icon"])}</div>`
            }
            item.innerHTML += menudata.items[i].name
            item.onclick = menudata.items[i].action
            menu.appendChild(item)
        }
        menu.style.width = (menu.offsetWidth + 10) + "px";
        menu.style.left = event.clientX + "px";
        menu.style.top = event.clientY + "px";
        // if menu would be off the screen, move it into view, but preserve the width
        if (menu.offsetLeft + menu.offsetWidth > window.innerWidth) {
            menu.style.left = (window.innerWidth - menu.offsetWidth) + "px";
        }
        if (menu.offsetTop + menu.offsetHeight > window.innerHeight) {
            menu.style.top = (window.innerHeight - menu.offsetHeight) + "px";
        }

        return menuBackground;
    }
}

const MusicKitObjects = {
    LibraryPlaylist: function () {
        this.id = ""
        this.type = "library-playlist-folders"
        this.href = ""
        this.attributes = {
            dateAdded: "",
            name: ""
        }
        this.playlists = []
    }
}

const MusicKitTools = {
    getHeader() {
        return new Headers({
            Authorization: 'Bearer ' + MusicKit.getInstance().developerToken,
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'Music-User-Token': '' + MusicKit.getInstance().musicUserToken
        });
    }
}

// limit an array to a certain number of items
Array.prototype.limit = function (n) {
    return this.slice(0, n);
};

const store = new Vuex.Store({
    state: {
        library: {
            songs: ipcRenderer.sendSync("get-library-songs"),
            albums: ipcRenderer.sendSync("get-library-albums"),
            recentlyAdded: ipcRenderer.sendSync("get-library-recentlyAdded"),
            playlists: ipcRenderer.sendSync("get-library-playlists")
        },
        artwork: {
            playerLCD: ""
        }
    },
    mutations: {
        setLCDArtwork(state, artwork) {
            state.artwork.playerLCD = artwork
        }
    }
})

const app = new Vue({
    el: "#app",
    store: store,
    data: {
        appMode: "player",
        ipcRenderer: ipcRenderer,
        cfg: ipcRenderer.sendSync("getStore"),
        isDev: ipcRenderer.sendSync("is-dev"),
        drawertest: false,
        platform: "",
        mk: {},
        quickPlayQuery: "",
        search: {
            term: "",
            hints: [],
            showHints: false,
            results: {},
            resultsSocial: {},
            limit: 10
        },
        fullscreenLyrics: false,
        playerLCD: {
            playbackDuration: 0,
            desiredDuration: 0,
            userInteraction: false
        },
        drawer: {
            open: false,
            panel: ""
        },
        browsepage: [],
        listennow: [],
        madeforyou: [],
        radio: {
            personal: []
        },
        webview: {
            url: "",
            title: "",
            loading: false
        },
        showingPlaylist: [],
        appleCurator: [],
        artistPage: {
            data: {},
        },
        library: {
            downloadNotification: {
                show: false,
                message: "",
                total: 0,
                progress: 0
            },
            songs: {
                sortingOptions: {
                    "albumName": "Album",
                    "artistName": "Artist",
                    "name": "Name",
                    "genre": "Genre",
                    "releaseDate": "Release Date",
                    "durationInMillis": "Duration"
                },
                sorting: "name",
                sortOrder: "asc",
                listing: [],
                meta: {total: 0, progress: 0},
                search: "",
                displayListing: [],
                downloadState: 0 // 0 = not started, 1 = in progress, 2 = complete, 3 = empty library
            },
            albums: {
                sortingOptions: {
                    "artistName": "Artist",
                    "name": "Name",
                    "genre": "Genre",
                    "releaseDate": "Release Date"
                },
                viewAs: 'covers',
                sorting: ["dateAdded", "name"], // [0] = recentlyadded page, [1] = albums page
                sortOrder: ["desc", "asc"], // [0] = recentlyadded page, [1] = albums page
                listing: [],
                meta: {total: 0, progress: 0},
                search: "",
                displayListing: [],
                downloadState: 0 // 0 = not started, 1 = in progress, 2 = complete, 3 = empty library
            },
            artists: {
                sortingOptions: {
                    "artistName": "Artist",
                    "name": "Name",
                    "genre": "Genre",
                    "releaseDate": "Release Date"
                },
                viewAs: 'covers',
                sorting: ["dateAdded", "name"], // [0] = recentlyadded page, [1] = albums page
                sortOrder: ["desc", "asc"], // [0] = recentlyadded page, [1] = albums page
                listing: [],
                meta: {total: 0, progress: 0},
                search: "",
                displayListing: [],
                downloadState: 0 // 0 = not started, 1 = in progress, 2 = complete, 3 = empty library
            },
        },
        playlists: {
            listing: [],
            details: {},
            loadingState: 0, // 0 loading, 1 loaded, 2 error
            id: ""
        },
        mxmtoken: "",
        mkIsReady: false,
        playerReady: false,
        animateBackground: false,
        currentArtUrl: '',
        lyricon: false,
        currentTrackID: '',
        currentTrackIDBG: '',
        lyrics: [],
        currentLyricsLine: 0,
        lyriccurrenttime: 0,
        richlyrics: [],
        lyricsMediaItem: {},
        lyricsDebug: {
            current: 0,
            start: 0,
            end: 0
        },
        tmpVar: [],
        notification: false,
        chrome: {
            hideUserInfo: ipcRenderer.sendSync("is-dev"),
            artworkReady: false,
            userinfo: {
                "id": "",
                "attributes": {
                    "name": "Cider User",
                    "handle": "CiderUser",
                    "artwork": {"url": "./assets/logocut.png"}
                }
            },
            menuOpened: false,
            maximized: false,
            drawerOpened: false,
            drawerState: "queue",
            topChromeVisible: true,
            progresshover: false,
        },
        collectionList: {
            response: {},
            title: "",
            type: ""
        },
        prevButtonBackIndicator: false,
        currentSongInfo: {},
        page: "",
        pageHistory: [],
        songstest: false,
        hangtimer: null,
        selectedMediaItems: [],
        routes: ["browse", "listen_now", "radio"],
        musicBaseUrl: "https://api.music.apple.com/",
        modals: {
            addToPlaylist: false,
            spatialProperties: false
        },
        socialBadges: {
            badgeMap: {},
            version: ""
        }
    },
    watch: {
        cfg: {
            handler: function (val, oldVal) {
                console.log(`cfg changed from ${oldVal} to ${val}`);
                ipcRenderer.send("setStore", val);
            },
            deep: true
        },
        page: () => {
            document.getElementById("app-content").scrollTo(0, 0);
            app.resetState()
        },
        showingPlaylist: () => {
            document.getElementById("app-content").scrollTo(0, 0);
            app.resetState()
        },
        artistPage: () => {
            document.getElementById("app-content").scrollTo(0, 0);
            app.resetState()
        },
    },
    methods: {
        async getSvgIcon(url) {
            let response = await fetch(url);
            let data = await response.text();
            return data;
        },
        getSocialBadges(cb = () => {
        }) {
            let self = this
            try {
                app.mk.api.socialBadgingMap().then(data => {
                    self.socialBadges.badgeMap = data.badgingMap
                    cb(data.badgingMap)
                })
            } catch (ex) {
                this.socialBadges.badgeMap = {}
            }
        },
        addFavorite(id, type) {
            this.cfg.home.favoriteItems.push({
                id: id,
                type: type
            });
        },
        modularUITest(val = false) {
            this.fullscreenLyrics = val;
            if (val) {
                document.querySelector("#app-main").classList.add("modular-fs")
            } else {
                document.querySelector("#app-main").classList.remove("modular-fs")
            }
        },
        navigateBack() {
            history.back()
        },
        navigateForward() {
            history.forward()
        },
        getHTMLStyle() {
            switch (this.cfg.visual.window_transparency) {
                case "acrylic":
                default:
                    document.querySelector("html").style.background = "";
                    document.querySelector("body").style.background = "";
                    document.querySelector("body").classList.remove("notransparency")
                    break;
                case "disabled":
                    document.querySelector("html").style.background = "#222";
                    document.querySelector("body").classList.add("notransparency")
                    
                    // document.querySelector("body").style.background = "#222";
                    break;
            }
        },
        resetState() {
            app.selectedMediaItems = [];
            for (let key in app.modals) {
                app.modals[key] = false;
            }
        },
        promptAddToPlaylist() {
            app.modals.addToPlaylist = true;
        },
        async addSelectedToPlaylist(playlist_id) {
            let self = this
            let pl_items = []
            for (let i = 0; i < self.selectedMediaItems.length; i++) {
                if (self.selectedMediaItems[i].kind == "song" || self.selectedMediaItems[i].kind == "songs") {
                    self.selectedMediaItems[i].kind = "songs"
                    pl_items.push({
                        id: self.selectedMediaItems[i].id,
                        type: self.selectedMediaItems[i].kind
                    })
                } else if ((self.selectedMediaItems[i].kind == "album" || self.selectedMediaItems[i].kind == "albums") && self.selectedMediaItems[i].isLibrary != true ) {
                    self.selectedMediaItems[i].kind = "albums"
                    let res = await self.mk.api.albumRelationship(self.selectedMediaItems[i].id,"tracks");
                    let ids = res.map(function(i) {return {id:i.id, type: i.type}})
                    pl_items = pl_items.concat(ids)
                } else if (self.selectedMediaItems[i].kind == "library-song" || self.selectedMediaItems[i].kind == "library-songs") {
                    self.selectedMediaItems[i].kind = "library-songs"                    
                    pl_items.push({
                        id: self.selectedMediaItems[i].id,
                        type: self.selectedMediaItems[i].kind
                    })
                } else if ((self.selectedMediaItems[i].kind == "library-album" || self.selectedMediaItems[i].kind == "library-albums") || (self.selectedMediaItems[i].kind == "album" && self.selectedMediaItems[i].isLibrary == true )) {
                    self.selectedMediaItems[i].kind = "library-albums"
                    let res = await self.mk.api.library.albumRelationship(self.selectedMediaItems[i].id,"tracks");
                    let ids = res.map(function(i) {return {id:i.id, type: i.type}})
                    pl_items = pl_items.concat(ids)
                } else {
                    pl_items.push({
                        id: self.selectedMediaItems[i].id,
                        type: self.selectedMediaItems[i].kind
                    })
                }
                
            }
            this.modals.addToPlaylist = false
            this.mk.api.library.appendTracksToPlaylist(playlist_id, pl_items).then(() => {
                if (this.page == 'playlist_' + this.showingPlaylist.id) {
                    this.getPlaylistFromID(this.showingPlaylist.id)
                }
            })
        },
        async init() {
            let self = this
            clearTimeout(this.hangtimer)
            this.mk = MusicKit.getInstance()
            this.mk.authorize().then(() => {
                self.mkIsReady = true
            })
            this.$forceUpdate()
            if (this.isDev) {
                this.mk.privateEnabled = true
            }
            if (this.cfg.visual.hw_acceleration == "disabled") {
                document.body.classList.add("no-gpu")
            }
            this.mk._services.timing.mode = 0
            this.platform = ipcRenderer.sendSync('cider-platform');
            // Set profile name
            this.chrome.userinfo = await this.mkapi("personalSocialProfile", false, "")
            // API Fallback
            if (!this.chrome.userinfo) {
                this.chrome.userinfo = {
                    "id": "",
                    "attributes": {
                        "name": "Cider User",
                        "handle": "CiderUser",
                        "artwork": {"url": "./assets/logocut.png"}
                    }
                }
            }
            MusicKitInterop.init()
            // Set the volume
            this.mk.volume = this.cfg.general.volume
            // ipcRenderer.invoke('getStoreValue', 'general.volume').then((value) => {
            //     self.mk.volume = value
            // })

            // load cached library
            if (localStorage.getItem("librarySongs") != null) {
                this.library.songs.listing = JSON.parse(localStorage.getItem("librarySongs"))
                this.library.songs.displayListing = this.library.songs.listing
            }
            if (localStorage.getItem("libraryAlbums") != null) {
                this.library.albums.listing = JSON.parse(localStorage.getItem("libraryAlbums"))
                this.library.albums.displayListing = this.library.albums.listing
            }

            window.onbeforeunload = function (e) {
                window.localStorage.setItem("currentTrack", JSON.stringify(app.mk.nowPlayingItem))
                window.localStorage.setItem("currentTime", JSON.stringify(app.mk.currentPlaybackTime))
                window.localStorage.setItem("currentQueue", JSON.stringify(app.mk.queue.items))
            };

            // Load saved quality
            switch (app.cfg.audio.quality) {
                case "extreme":
                    app.mk.bitrate = app.cfg.audio.quality = 990
                    break;
                case "high":
                    app.mk.bitrate = app.cfg.audio.quality = 256
                    break;
                case "low":
                    app.mk.bitrate = app.cfg.audio.quality = 64
                    break;
                default:
                    app.mk.bitrate = app.cfg.audio.quality
            }


            // load last played track
            try {
                let lastItem = window.localStorage.getItem("currentTrack")
                let time = window.localStorage.getItem("currentTime")
                let queue = window.localStorage.getItem("currentQueue")
                if (lastItem != null) {
                    lastItem = JSON.parse(lastItem)
                    let kind = lastItem.attributes.playParams.kind;
                    let truekind = (!kind.endsWith("s")) ? (kind + "s") : kind;
                    app.mk.setQueue({[truekind]: [lastItem.attributes.playParams.id]})
                    app.mk.mute()
                    setTimeout(() => {
                        app.mk.play().then(() => {
                            app.mk.pause().then(() => {
                                if (time != null) {
                                    app.mk.seekToTime(time)
                                }
                                app.mk.unmute()
                                if (queue != null) {
                                    queue = JSON.parse(queue)
                                    if (queue && queue.length > 0) {
                                        let ids = queue.map(e => (e.playParams ? e.playParams.id : (e.attributes.playParams ? e.attributes.playParams.id : '')))
                                        let i = 0;
                                        if (ids.length > 0) {
                                            for (id of ids) {
                                                if (!(i == 0 && ids[0] == lastItem.attributes.playParams.id)) {
                                                    try {
                                                        app.mk.playLater({songs: [id]})
                                                    } catch (err) {
                                                    }
                                                }
                                                i++;
                                            }
                                        }
                                    }
                                }

                            })

                        })
                    }, 1500)

                }

            } catch (e) {
                console.log(e)
            }

            MusicKit.getInstance().videoContainerElement = document.getElementById("apple-music-video-player")

            ipcRenderer.on('SoundCheckTag', (event, tag) => {
                let replaygain = self.parseSCTagToRG(tag)
                try {
                    CiderAudio.audioNodes.gainNode.gain.value = (Math.min(Math.pow(10, (replaygain.gain / 20)), (1 / replaygain.peak)))
                } catch (e) {

                }
            })

            this.mk.addEventListener(MusicKit.Events.playbackTimeDidChange, (a) => {
                self.lyriccurrenttime = self.mk.currentPlaybackTime
                this.currentSongInfo = a
                self.playerLCD.playbackDuration = (self.mk.currentPlaybackTime)
            })

            this.mk.addEventListener(MusicKit.Events.nowPlayingItemDidChange, (a) => {
                if (self.$refs.queue) {
                    self.$refs.queue.updateQueue();
                }
                this.currentSongInfo = a


                if (app.cfg.audio.normalization) {
                    // get unencrypted audio previews to get SoundCheck's normalization tag
                    try {
                        let previewURL = null
                        try {
                            previewURL = app.mk.nowPlayingItem.previewURL
                        } catch (e) {
                        }
                        if (!previewURL) {
                            app.mk.api.song(app.mk.nowPlayingItem._songId ?? app.mk.nowPlayingItem.relationships.catalog.data[0].id).then((response) => {
                                previewURL = response.attributes.previews[0].url
                                if (previewURL)
                                    ipcRenderer.send('getPreviewURL', previewURL)
                            })
                        } else {
                            if (previewURL)
                                ipcRenderer.send('getPreviewURL', previewURL)
                        }

                    } catch (e) {
                    }
                }

                try {
                    a = a.item.attributes;
                } catch (_) {
                }
                let type = (self.mk.nowPlayingItem != null) ? self.mk.nowPlayingItem["type"] ?? '' : '';

                if (type.includes("musicVideo") || type.includes("uploadedVideo") || type.includes("music-movie")) {
                    document.getElementById("apple-music-video-container").style.display = "block";
                    // app.chrome.topChromeVisible = false
                } else {
                    document.getElementById("apple-music-video-container").style.display = "none";
                    // app.chrome.topChromeVisible = true
                }
                self.chrome.artworkReady = false
                self.lyrics = []
                self.richlyrics = []
                app.getCurrentArtURL();
                // app.getNowPlayingArtwork(42); 
                app.getNowPlayingArtworkBG(32);
                app.loadLyrics();

                // Playback Notifications
                if ((app.platform === "darwin" || app.platform === "linux") && !document.hasFocus() && a.artistName && a.artwork && a.name) {
                    if (this.notification) {
                        this.notification.close()
                    }
                    this.notification = new Notification(a.name, {
                        body: a.artistName,
                        icon: a.artwork.url.replace('/{w}x{h}bb', '/512x512bb').replace('/2000x2000bb', '/35x35bb'),
                        silent: true,
                    });
                }

            })


            this.mk.addEventListener(MusicKit.Events.playbackVolumeDidChange, (_a) => {
                this.cfg.general.volume = this.mk.volume
            })

            this.refreshPlaylists()
            document.body.removeAttribute("loading")
            if (window.location.hash != "") {
                this.appRoute(window.location.hash)
            } else {
                this.page = "home"
            }

            setTimeout(() => {
                this.getSocialBadges()
                this.getBrowsePage();
                this.$forceUpdate()
            }, 500)
        },
        invokeDrawer(panel) {
            if (this.drawer.panel == panel && this.drawer.open) {
                if (panel == "lyrics") {
                    this.lyricon = false
                }
                this.drawer.panel = ""
                this.drawer.open = false
            } else {
                if (panel == "lyrics") {
                    this.lyricon = true
                } else {
                    this.lyricon = false
                }
                this.drawer.open = true
                this.drawer.panel = panel
            }
        },
        select_removeMediaItem(id) {
            this.selectedMediaItems.filter(item => item.guid == id).forEach(item => {
                this.selectedMediaItems.splice(this.selectedMediaItems.indexOf(item), 1)
            })
        },
        select_hasMediaItem(id) {
            let found = this.selectedMediaItems.find(item => item.guid == id)
            if (found) {
                return true
            } else {
                return false
            }
        },
        select_selectMediaItem(id, kind, index, guid, library) {
            if (!this.select_hasMediaItem(guid)) {
                this.selectedMediaItems.push({
                    id: id,
                    kind: kind,
                    index: index,
                    guid: guid,
                    isLibrary: library
                })
            }
        },
        getPlaylistFolderChildren(id) {
            return this.playlists.listing.filter(playlist => {
                if (playlist.parent == id) {
                    return playlist
                }
            })
        },
        async refreshPlaylists() {
            let self = this
            this.apiCall('https://api.music.apple.com/v1/me/library/playlist-folders/p.playlistsroot/children/', res => {
                self.playlists.listing = res.data
                self.playlists.listing.forEach(playlist => {
                    playlist.parent = "p.playlistsroot"
                })
                self.sortPlaylists()
            })
        },
        sortPlaylists() {
            this.playlists.listing.sort((a, b) => {
                if (a.type === "library-playlist-folders" && b.type !== "library-playlist-folders") {
                    return -1
                } else if (a.type !== "library-playlist-folders" && b.type === "library-playlist-folders") {
                    return 1
                } else {
                    return 0
                }
            })
        },
        playlistHeaderContextMenu(event) {
            let menu = {
                items: [
                    {
                        name: "New Playlist",
                        action: () => {
                            this.newPlaylist()
                        }
                    },
                    {
                        name: "New Playlist Folder",
                        action: () => {
                            this.newPlaylistFolder()
                        }
                    }
                ]
            }
            CiderContextMenu.Create(event, menu)
        },
        async editPlaylistFolder(id, name = "New Playlist") {
            let self = this
            this.mk.api.v3.music(
                `/v1/me/library/playlist-folders/${id}`,
                {},
                {
                    fetchOptions: {
                        method: "PATCH",
                        body: JSON.stringify({
                            attributes: {name: name}
                        })
                    }
                }
            ).then(res => {
                self.refreshPlaylists()
            })
        },
        async editPlaylist(id, name = "New Playlist") {
            let self = this
            this.mk.api.v3.music(
                `/v1/me/library/playlists/${id}`,
                {},
                {
                    fetchOptions: {
                        method: "PATCH",
                        body: JSON.stringify({
                            attributes: {name: name}
                        })
                    }
                }
            ).then(res => {
                    self.refreshPlaylists()
                })
        },
        copyToClipboard(str) {
            navigator.clipboard.writeText(str)
        },
        newPlaylist(name = "New Playlist", tracks = []) {
            let self = this
            let request = {
                name: name
            }
            if (tracks.length > 0) {
                request.tracks = tracks
            }
            app.mk.api.library.createPlaylist(request).then(res => {
                console.log(res)
                self.appRoute(`playlist_` + res.id);
                self.showingPlaylist = [];
                self.getPlaylistFromID(app.page.substring(9))
                self.playlists.listing.push({
                    id: res.id,
                    attributes: {
                        name: name
                    },
                    parent: "p.playlistsroot"
                })
                self.sortPlaylists()
                setTimeout(() => {
                    app.refreshPlaylists()
                }, 8000)
            })
        },
        deletePlaylist(id) {
            let self = this
            if (confirm(`Are you sure you want to delete this playlist?`)) {
                app.mk.api.library.deletePlaylist(id).then(res => {
                    // remove this playlist from playlists.listing if it exists
                    let found = self.playlists.listing.find(item => item.id == id)
                    if (found) {
                        self.playlists.listing.splice(self.playlists.listing.indexOf(found), 1)
                    }
                })
            }
        },
        async showCollection(response, title, type) {
            let self = this
            this.collectionList.response = response
            this.collectionList.title = title
            this.collectionList.type = type
            app.appRoute("collection-list")
        },
        async showArtistView(artist, title, view) {
            let response = await this.mk.api.artistView(artist, view, {}, {view: view, includeResponseMeta: !0})
            await this.showCollection(response, title, "artists")
        },
        async showRecordLabelView(label, title, view) {
            let response = await this.mk.api.recordLabelView(label, view, {}, {view: view, includeResponseMeta: !0})
            await this.showCollection(response, title, "record-labels")
        },
        async showSearchView(term, group, title) {
            let response = await this.mk.api.search(term, {
                platform: "web",
                groups: group,
                types: "activities,albums,apple-curators,artists,curators,editorial-items,music-movies,music-videos,playlists,songs,stations,tv-episodes,uploaded-videos,record-labels",
                limit: 25,
                relate: {
                    editorialItems: ["contents"]
                },
                include: {
                    albums: ["artists"],
                    songs: ["artists"],
                    "music-videos": ["artists"]
                },
                extend: "artistUrl",
                fields: {
                    artists: "url,name,artwork,hero",
                    albums: "artistName,artistUrl,artwork,contentRating,editorialArtwork,name,playParams,releaseDate,url"
                },
                with: "serverBubbles,lyricHighlights",
                art: {
                    "url": "cf"
                },
                omit: {
                    resource: ["autos"]
                }
            }, {groups: group, includeResponseMeta: !0})
            console.log(response)
            let responseFormat = {
                data: response[group].data.data,
                next: response[group].next,
                groups: group
            }
            await this.showCollection(responseFormat, title, "search")
        },
        async getPlaylistContinuous(response, transient = false) {
            let self = this
            let playlistId = response.id
            if (!transient) this.playlists.loadingState = 0
            this.showingPlaylist = response
            if (!response.relationships.tracks.next) {
                this.playlists.loadingState = 1
                return
            }

            function getPlaylistTracks(next) {
                app.apiCall(app.musicBaseUrl + next, res => {
                    if (self.showingPlaylist.id != playlistId) {
                        return
                    }
                    self.showingPlaylist.relationships.tracks.data = self.showingPlaylist.relationships.tracks.data.concat(res.data)
                    if (res.next) {
                        getPlaylistTracks(res.next)
                    } else {
                        self.playlists.loadingState = 1
                    }
                })
            }

            getPlaylistTracks(response.relationships.tracks.next)

        },
        async getPlaylistFromID(id, transient = false) {
            let self = this
            const params = {
                include: "tracks",
                platform: "web",
                "include[library-playlists]": "catalog,tracks",
                "fields[playlists]": "curatorName,playlistType,name,artwork,url",
                "include[library-songs]": "catalog,artists,albums",
                "fields[catalog]": "artistUrl,albumUrl",
                "fields[songs]": "artistUrl,albumUrl"
            }
            if (!transient) {this.playlists.loadingState = 0;}
            let playlistId = ''

            try {
                app.mk.api.library.playlist(id, params).then(res => {
                    self.getPlaylistContinuous(res, transient)
                })
            } catch (e) {
                console.log(e);
                try {
                    app.mk.api.library.playlist(id, params).then(res => {
                        self.getPlaylistContinuous(res, transient)
                    })
                } catch (err) {
                    console.log(err)
                }
            }

        },
        async getArtistFromID(id) {
            const artistData = await this.mkapi("artists", false, id, {
                "views": "featured-release,full-albums,appears-on-albums,featured-albums,featured-on-albums,singles,compilation-albums,live-albums,latest-release,top-music-videos,similar-artists,top-songs,playlists,more-to-hear,more-to-see",
                "extend": "artistBio,bornOrFormed,editorialArtwork,editorialVideo,isGroup,origin,hero",
                "extend[playlists]": "trackCount",
                "include[songs]": "albums",
                "fields[albums]": "artistName,artistUrl,artwork,contentRating,editorialArtwork,editorialVideo,name,playParams,releaseDate,url,trackCount",
                "limit[artists:top-songs]": 20,
                "art[url]": "f"
            }, {includeResponseMeta: !0})
            console.log(artistData)
            this.artistPage.data = artistData.data[0]
            this.page = "artist-page"
        },
        progressBarStyle() {
            let val = this.playerLCD.playbackDuration
            if (this.playerLCD.desiredDuration > 0) {
                val = this.playerLCD.desiredDuration
            }
            let min = 0
            let max = this.mk.currentPlaybackDuration
            let value = (val - min) / (max - min) * 100
            return {
                'background': ('linear-gradient(to right, var(--keyColor) 0%, var(--keyColor) ' + value + '%, #333 ' + value + '%, #333 100%)')
            }
        },
        async getRecursive(response) {
            // if response has a .next() property run it and keep running until .next is null or undefined
            // and then return the response concatenated with the results of the next() call
            function executeRequest() {
                if (response.next) {
                    return response.next().then(executeRequest)
                } else {
                    return response
                }
            }

            return executeRequest()
        },
        async getRecursive2(response, sendTo) {
            let returnData = {
                "data": [],
                "meta": {}
            }
            if (response.next) {
                console.log("has next")
                returnData.data.concat(response.data)
                returnData.meta = response.meta
                return await this.getRecursive(await response.next())
            } else {
                console.log("no next")
                returnData.data.concat(response.data)
                return returnData
            }
        },
        async getSearchHints() {
            if (this.search.term == "") {
                this.search.hints = []
                return
            }
            let hints = await app.mkapi("searchHints", false, this.search.term)
            this.search.hints = hints ? hints.terms : []
        },
        getSongProgress() {
            if (this.playerLCD.userInteraction) {
                return this.playerLCD.desiredDuration
            } else {
                return this.playerLCD.playbackDuration
            }
        },
        convertToMins(time) {
            let mins = Math.floor(time / 60)
            let seconds = (Math.floor(time % 60) / 100).toFixed(2)
            return `${mins}:${seconds.replace("0.", "")}`
        },
        hashCode(str) {
            let hash = 0, i, chr;
            if (str.length === 0) return hash;
            for (i = 0; i < str.length; i++) {
                chr = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + chr;
                hash |= 0; // Convert to 32bit integer
            }
            return hash;
        },
        appRoute(route) {
            if (route == "" || route == "#" || route == "/") {
                return;
            }
            route = route.replace(/#/g, "")
            // if the route contains does not include a / then route to the page directly
            if (route.indexOf("/") == -1) {
                this.page = route
                window.location.hash = this.page
                return
            }
            let hash = route.split("/")
            let page = hash[0]
            let id = hash[1]
            console.log(`page: ${page} id: ${id}`)
            this.routeView({
                kind: page,
                id: id,
                attributes: {
                    playParams: {kind: page, id: id}
                }
            })
        },
        routeView(item) {
            let kind = (item.attributes.playParams ? (item.attributes.playParams.kind ?? (item.type ?? '')) : (item.type ?? ''));
            let id = (item.attributes.playParams ? (item.attributes.playParams.id ?? (item.id ?? '')) : (item.id ?? ''));
            ;
            let isLibrary = item.attributes.playParams ? (item.attributes.playParams.isLibrary ?? false) : false;
            console.log(kind, id, isLibrary)

            if (true) {
                if (kind.includes("playlist") || kind.includes("album")) {
                    app.showingPlaylist = [];
                }
                if (kind.toString().includes("apple-curator")) {
                    kind = "appleCurator"
                    app.getTypeFromID("appleCurator", (id), false, {
                        platform: "web",
                        include: "grouping,playlists",
                        extend: "editorialArtwork",
                        "art[url]": "f"
                    });
                    window.location.hash = `${kind}/${id}`
                    document.querySelector("#app-content").scrollTop = 0
                } else if (kind.toString().includes("artist")) {
                    app.getArtistInfo(id, isLibrary)
                    window.location.hash = `${kind}/${id}`
                    document.querySelector("#app-content").scrollTop = 0

                } else if (kind.toString().includes("record-label") || kind.toString().includes("curator")) {
                    if (kind.toString().includes("record-label")) {
                        kind = "recordLabel"
                    } else {
                        kind = "curator"
                    }
                    app.page = (kind) + "_" + (id);
                    app.getTypeFromID((kind), (id), (isLibrary), {
                        extend: "editorialVideo",
                        include: 'grouping,playlists',
                        views: 'top-releases,latest-releases,top-artists'
                    });
                    window.location.hash = `${kind}/${id}`
                    document.querySelector("#app-content").scrollTop = 0
                } else if (!kind.toString().includes("radioStation") && !kind.toString().includes("song") && !kind.toString().includes("musicVideo") && !kind.toString().includes("uploadedVideo") && !kind.toString().includes("music-movie")) {
                    let params = {extend: "editorialVideo"}
                    app.page = (kind) + "_" + (id);
                    app.getTypeFromID((kind), (id), (isLibrary), params);
                    window.location.hash = `${kind}/${id}`
                    document.querySelector("#app-content").scrollTop = 0
                } else {
                    app.playMediaItemById((id), (kind), (isLibrary), item.attributes.url ?? '')
                }

            }

        },
        prevButton() {
            if (!app.prevButtonBackIndicator && app.mk.nowPlayingItem && app.mk.currentPlaybackTime > 2) {
                app.prevButtonBackIndicator = true;
                app.mk.seekToTime(0);
            } else {
                app.prevButtonBackIndicator = false;
                app.mk.skipToPreviousItem()
            }
        },
        async getNowPlayingItemDetailed(target) {
            let u = await app.mkapi(app.mk.nowPlayingItem.playParams.kind, (app.mk.nowPlayingItem.songId == -1), (app.mk.nowPlayingItem.songId != -1) ? app.mk.nowPlayingItem.songId : app.mk.nowPlayingItem["id"], {"include[songs]": "albums,artists"});
            app.searchAndNavigate(u, target)
        },
        async searchAndNavigate(item, target) {
            let self = this
            app.tmpVar = item;
            switch (target) {
                case "artist":
                    let artistId = '';
                    try {
                        if (item.relationships.artists && item.relationships.artists.data.length > 0 && !item.relationships.artists.data[0].type.includes("library")) {
                            if (item.relationships.artists.data[0].type === "artist" || item.relationships.artists.data[0].type === "artists") {
                                artistId = item.relationships.artists.data[0].id
                            }
                        }
                        if (artistId == '') {
                            const url = (item.relationships.catalog.data[0].attributes.artistUrl);
                            artistId = (url).substring(url.lastIndexOf('/') + 1)
                            if (artistId.includes('viewCollaboration')) {
                                artistId = artistId.substring(artistId.lastIndexOf('ids=') + 4, artistId.lastIndexOf('-'))
                            }
                        }
                    } catch (_) {
                    }

                    if (artistId == "") {
                        let artistQuery = await app.mk.api.search(item.attributes.artistName, {
                            limit: 1,
                            types: 'artists'
                        })
                        try {
                            if (artistQuery.artists.data.length > 0) {
                                artistId = artistQuery.artists.data[0].id;
                                console.log(artistId)
                            }
                        } catch (e) {
                        }
                    }
                    console.log(artistId);
                    if (artistId != "")
                        self.appRoute(`artist/${artistId}`)
                    break;
                case "album":
                    let albumId = '';
                    try {
                        if (item.relationships.albums && item.relationships.albums.data.length > 0 && !item.relationships.albums.data[0].type.includes("library")) {
                            if (item.relationships.albums.data[0].type === "album" || item.relationships.albums.data[0].type === "albums") {
                                albumId = item.relationships.albums.data[0].id
                            }
                        }
                        if (albumId == '') {
                            const url = (item.relationships.catalog.data[0].attributes.url);
                            albumId = (url).substring(url.lastIndexOf('/') + 1)
                            if (albumId.includes("?i=")) {
                                albumId = albumId.substring(0, albumId.indexOf("?i="))
                            }
                        }
                    } catch (_) {
                    }

                    if (albumId == "") {
                        try {
                            let albumQuery = await app.mk.api.search(item.attributes.albumName + " " + (item.attributes.artistName ?? ""), {
                                limit: 1,
                                types: 'albums'
                            })
                            if (albumQuery.albums.data.length > 0) {
                                albumId = albumQuery.albums.data[0].id;
                                console.log(albumId)
                            }
                        } catch (e) {
                        }
                    }
                    if (albumId != "") {
                        self.appRoute(`album/${albumId}`)
                    }
                    break;
                case "recordLabel":
                    let labelId = '';
                    try {
                        labelId = item.relationships['record-labels'].data[0].id
                    } catch (_) {
                    }

                    if (labelId == "") {
                        try {
                            let labelQuery = await app.mk.api.search(item.attributes.recordLabel, {
                                limit: 1,
                                types: 'record-labels'
                            })
                            if (labelQuery["record-labels"].data.length > 0) {
                                labelId = labelQuery["record-labels"].data[0].id;
                                console.log(labelId)
                            }
                        } catch (e) {
                        }
                    }
                    if (labelId != "") {
                        app.showingPlaylist = []
                        await app.getTypeFromID("recordLabel", labelId, false, {views: 'top-releases,latest-releases,top-artists'});
                        app.page = "recordLabel_" + labelId;
                    }

                    break;
            }
        },
        exitMV() {
            MusicKit.getInstance().stop()
            document.getElementById("apple-music-video-container").style.display = "none";
        },
        getArtistInfo(id, isLibrary) {
            this.getArtistFromID(id)
            //this.getTypeFromID("artist",id,isLibrary,query)
        },
        playMediaItem(item) {
            let kind = (item.attributes.playParams ? (item.attributes.playParams.kind ?? (item.type ?? '')) : (item.type ?? ''));
            let id = (item.attributes.playParams ? (item.attributes.playParams.id ?? (item.id ?? '')) : (item.id ?? ''));
            ;
            let isLibrary = item.attributes.playParams ? (item.attributes.playParams.isLibrary ?? false) : false;
            console.log(kind, id, isLibrary)
            if (kind.includes("artist")) {
                app.mk.setStationQueue({artist: 'a-' + id}).then(() => {
                    app.mk.play()
                })
            } else {
                app.playMediaItemById((id), (kind), (isLibrary), item.attributes.url ?? '')
            }
        },
        async getTypeFromID(kind, id, isLibrary = false, params = {}, params2 = {}) {
            let a;
            if (kind == "album" | kind == "albums") {
                params["include"] = "tracks,artists,record-labels";
            }
            try {
                a = await this.mkapi(kind.toString(), isLibrary, id.toString(), params, params2);
            } catch (e) {
                console.log(e);
                try {
                    a = await this.mkapi(kind.toString(), !isLibrary, id.toString(), params, params2);
                } catch (err) {
                    console.log(err);
                    a = []
                } finally {
                    if (kind == "appleCurator") {
                        app.appleCurator = a
                    } else {
                        this.getPlaylistContinuous(a)
                    }
                }
            } finally {
                if (kind == "appleCurator") {
                    app.appleCurator = a
                } else {
                    this.getPlaylistContinuous(a)
                }
            }
            ;
        },
        searchLibrarySongs() {
            let self = this

            function sortSongs() {
                // sort this.library.songs.displayListing by song.attributes[self.library.songs.sorting] in descending or ascending order based on alphabetical order and numeric order
                // check if song.attributes[self.library.songs.sorting] is a number and if so, sort by number if not, sort by alphabetical order ignoring case
                self.library.songs.displayListing.sort((a, b) => {
                    let aa = a.attributes[self.library.songs.sorting]
                    let bb = b.attributes[self.library.songs.sorting]
                    if (self.library.songs.sorting == "genre") {
                        aa = a.attributes.genreNames[0]
                        bb = b.attributes.genreNames[0]
                    }
                    if (aa == null) {
                        aa = ""
                    }
                    if (bb == null) {
                        bb = ""
                    }
                    if (self.library.songs.sortOrder == "asc") {
                        if (aa.toString().match(/^\d+$/) && bb.toString().match(/^\d+$/)) {
                            return aa - bb
                        } else {
                            return aa.toString().toLowerCase().localeCompare(bb.toString().toLowerCase())
                        }
                    } else if (self.library.songs.sortOrder == "desc") {
                        if (aa.toString().match(/^\d+$/) && bb.toString().match(/^\d+$/)) {
                            return bb - aa
                        } else {
                            return bb.toString().toLowerCase().localeCompare(aa.toString().toLowerCase())
                        }
                    }
                })
            }

            if (this.library.songs.search == "") {
                this.library.songs.displayListing = this.library.songs.listing
                sortSongs()
            } else {
                this.library.songs.displayListing = this.library.songs.listing.filter(item => {
                    let itemName = item.attributes.name.toLowerCase()
                    let searchTerm = this.library.songs.search.toLowerCase()
                    let artistName = ""
                    let albumName = ""
                    if (item.attributes.artistName != null) {
                        artistName = item.attributes.artistName.toLowerCase()
                    }
                    if (item.attributes.albumName != null) {
                        albumName = item.attributes.albumName.toLowerCase()
                    }

                    // remove any non-alphanumeric characters and spaces from search term and item name
                    searchTerm = searchTerm.replace(/[^a-z0-9 ]/gi, "")
                    itemName = itemName.replace(/[^a-z0-9 ]/gi, "")
                    artistName = artistName.replace(/[^a-z0-9 ]/gi, "")
                    albumName = albumName.replace(/[^a-z0-9 ]/gi, "")

                    if (itemName.includes(searchTerm) || artistName.includes(searchTerm) || albumName.includes(searchTerm)) {
                        return item
                    }
                })
                sortSongs()
            }
        },
        // make a copy of searchLibrarySongs except use Albums instead of Songs
        searchLibraryAlbums(index) {
            let self = this

            function sortAlbums() {
                // sort this.library.albums.displayListing by album.attributes[self.library.albums.sorting[index]] in descending or ascending order based on alphabetical order and numeric order
                // check if album.attributes[self.library.albums.sorting[index]] is a number and if so, sort by number if not, sort by alphabetical order ignoring case
                self.library.albums.displayListing.sort((a, b) => {
                    let aa = a.attributes[self.library.albums.sorting[index]]
                    let bb = b.attributes[self.library.albums.sorting[index]]
                    if (self.library.albums.sorting[index] == "genre") {
                        aa = a.attributes.genreNames[0]
                        bb = b.attributes.genreNames[0]
                    }
                    if (aa == null) {
                        aa = ""
                    }
                    if (bb == null) {
                        bb = ""
                    }
                    if (self.library.albums.sortOrder[index] == "asc") {
                        if (aa.toString().match(/^\d+$/) && bb.toString().match(/^\d+$/)) {
                            return aa - bb
                        } else {
                            return aa.toString().toLowerCase().localeCompare(bb.toString().toLowerCase())
                        }
                    } else if (self.library.albums.sortOrder[index] == "desc") {
                        if (aa.toString().match(/^\d+$/) && bb.toString().match(/^\d+$/)) {
                            return bb - aa
                        } else {
                            return bb.toString().toLowerCase().localeCompare(aa.toString().toLowerCase())
                        }
                    }
                })
            }

            if (this.library.albums.search == "") {
                this.library.albums.displayListing = this.library.albums.listing
                sortAlbums()
            } else {
                this.library.albums.displayListing = this.library.albums.listing.filter(item => {
                    let itemName = item.attributes.name.toLowerCase()
                    let searchTerm = this.library.albums.search.toLowerCase()
                    let artistName = ""
                    let albumName = ""
                    if (item.attributes.artistName != null) {
                        artistName = item.attributes.artistName.toLowerCase()
                    }
                    if (item.attributes.albumName != null) {
                        albumName = item.attributes.albumName.toLowerCase()
                    }

                    // remove any non-alphanumeric characters and spaces from search term and item name
                    searchTerm = searchTerm.replace(/[^a-z0-9 ]/gi, "")
                    itemName = itemName.replace(/[^a-z0-9 ]/gi, "")
                    artistName = artistName.replace(/[^a-z0-9 ]/gi, "")
                    albumName = albumName.replace(/[^a-z0-9 ]/gi, "")

                    if (itemName.includes(searchTerm) || artistName.includes(searchTerm) || albumName.includes(searchTerm)) {
                        return item
                    }
                })
                sortAlbums()
            }
        },
        // make a copy of searchLibrarySongs except use Albums instead of Songs
        searchLibraryArtists(index) {
            let self = this

            function sortArtists() {
                // sort this.library.albums.displayListing by album.attributes[self.library.albums.sorting[index]] in descending or ascending order based on alphabetical order and numeric order
                // check if album.attributes[self.library.albums.sorting[index]] is a number and if so, sort by number if not, sort by alphabetical order ignoring case
                self.library.artists.displayListing.sort((a, b) => {
                    let aa = a.attributes[self.library.artists.sorting[index]]
                    let bb = b.attributes[self.library.artists.sorting[index]]
                    if (self.library.artists.sorting[index] == "genre") {
                        aa = a.attributes.genreNames[0]
                        bb = b.attributes.genreNames[0]
                    }
                    if (aa == null) {
                        aa = ""
                    }
                    if (bb == null) {
                        bb = ""
                    }
                    if (self.library.artists.sortOrder[index] == "asc") {
                        if (aa.toString().match(/^\d+$/) && bb.toString().match(/^\d+$/)) {
                            return aa - bb
                        } else {
                            return aa.toString().toLowerCase().localeCompare(bb.toString().toLowerCase())
                        }
                    } else if (self.library.artists.sortOrder[index] == "desc") {
                        if (aa.toString().match(/^\d+$/) && bb.toString().match(/^\d+$/)) {
                            return bb - aa
                        } else {
                            return bb.toString().toLowerCase().localeCompare(aa.toString().toLowerCase())
                        }
                    }
                })
            }

            if (this.library.artists.search == "") {
                this.library.artists.displayListing = this.library.artists.listing
                sortArtists()
            } else {
                this.library.artists.displayListing = this.library.artists.listing.filter(item => {
                    let itemName = item.attributes.name.toLowerCase()
                    let searchTerm = this.library.artists.search.toLowerCase()
                    let artistName = ""
                    let albumName = ""
                    // if (item.attributes.artistName != null) {
                    //     artistName = item.attributes.artistName.toLowerCase()
                    // }
                    // if (item.attributes.albumName != null) {
                    //     albumName = item.attributes.albumName.toLowerCase()
                    // }

                    // remove any non-alphanumeric characters and spaces from search term and item name
                    searchTerm = searchTerm.replace(/[^a-z0-9 ]/gi, "")
                    itemName = itemName.replace(/[^a-z0-9 ]/gi, "")


                    if (itemName.includes(searchTerm) || artistName.includes(searchTerm) || albumName.includes(searchTerm)) {
                        return item
                    }
                })
                sortArtists()
            }
        },
        getSidebarItemClass(page) {
            if (this.page == page) {
                return ["active"]
            } else {
                return []
            }
        },
        async mkapi(method, library = false, term, params = {}, params2 = {}, attempts = 0) {
            if (attempts > 3) {
                return
            }
            try {
                if (library) {
                    return await this.mk.api.library[method](term, params, params2)
                } else {
                    return await this.mk.api[method](term, params, params2)
                }
            } catch (e) {
                console.log(e)
                return await this.mkapi(method, library, term, params, params2, attempts + 1)
            }
        },
        getLibraryGenres() {
            let genres = []
            genres = []
            this.library.songs.listing.forEach((item) => {
                item.attributes.genreNames.forEach((genre) => {
                    if (!genres.includes(genre)) {
                        genres.push(genre)
                    }
                })
            })
            return genres
        },
        async getLibrarySongsFull(force = false) {
            let self = this
            let library = []
            let downloaded = null;
            if ((this.library.songs.downloadState == 2) && !force) {
                return
            }
            if (this.library.songs.downloadState == 1) {
                return
            }
            if (localStorage.getItem("librarySongs") != null) {
                this.library.songs.listing = JSON.parse(localStorage.getItem("librarySongs"))
                this.searchLibrarySongs()
            }
            if (this.songstest) {
                return
            }
            this.library.songs.downloadState = 1
            this.library.downloadNotification.show = true
            this.library.downloadNotification.message = "Updating library songs..."

            function downloadChunk() {
                const params = {
                    "include[library-songs]": "catalog,artists,albums",
                    "fields[artists]": "name,url,id",
                    "fields[albums]": "name,url,id",
                    platform: "web",
                    "fields[catalog]": "artistUrl,albumUrl",
                    "fields[songs]": "artistName,artistUrl,artwork,contentRating,editorialArtwork,name,playParams,releaseDate,url",
                    limit: 100,
                }
                self.library.songs.downloadState = 1
                if (downloaded == null) {
                    app.mk.api.library.songs("", params, {includeResponseMeta: !0}).then((response) => {
                        processChunk(response)
                    })
                } else {
                    downloaded.next("", params, {includeResponseMeta: !0}).then((response) => {
                        processChunk(response)
                    })
                }
            }

            function processChunk(response) {
                downloaded = response
                library = library.concat(downloaded.data)
                self.library.downloadNotification.show = true
                self.library.downloadNotification.message = "Updating library songs..."
                self.library.downloadNotification.total = downloaded.meta.total
                self.library.downloadNotification.progress = library.length

                if (downloaded.meta.total == 0) {
                    self.library.songs.downloadState = 3
                    return
                }
                if (typeof downloaded.next == "undefined") {
                    console.log("downloaded.next is undefined")
                    self.library.songs.listing = library
                    self.library.songs.downloadState = 2
                    self.library.downloadNotification.show = false
                    self.searchLibrarySongs()
                    localStorage.setItem("librarySongs", JSON.stringify(library))
                }
                if (downloaded.meta.total > library.length || typeof downloaded.meta.next != "undefined") {
                    console.log(`downloading next chunk - ${library.length} songs so far`)
                    downloadChunk()
                } else {
                    self.library.songs.listing = library
                    self.library.songs.downloadState = 2
                    self.library.downloadNotification.show = false
                    self.searchLibrarySongs()
                    localStorage.setItem("librarySongs", JSON.stringify(library))
                    console.log(library)
                }
            }

            downloadChunk()
        },
        // copy the getLibrarySongsFull function except change Songs to Albums
        async getLibraryAlbumsFull(force = false, index) {
            let self = this
            let library = []
            let downloaded = null;
            if ((this.library.albums.downloadState == 2 || this.library.albums.downloadState == 1) && !force) {
                return
            }
            if (localStorage.getItem("libraryAlbums") != null) {
                this.library.albums.listing = JSON.parse(localStorage.getItem("libraryAlbums"))
                this.searchLibraryAlbums(index)
            }
            if (this.songstest) {
                return
            }
            this.library.albums.downloadState = 1
            this.library.downloadNotification.show = true
            this.library.downloadNotification.message = "Updating library albums..."

            function downloadChunk() {
                self.library.albums.downloadState = 1
                const params = {
                    "include[library-albums]": "catalog,artists,albums",
                    "fields[artists]": "name,url,id",
                    "fields[albums]": "name,url,id",
                    platform: "web",
                    "fields[catalog]": "artistUrl,albumUrl",
                    "fields[albums]": "artistName,artistUrl,artwork,contentRating,editorialArtwork,name,playParams,releaseDate,url",
                    limit: 100,
                }
                if (downloaded == null) {
                    app.mk.api.library.albums("", params, {includeResponseMeta: !0}).then((response) => {
                        processChunk(response)
                    })
                } else {
                    downloaded.next("", params, {includeResponseMeta: !0}).then((response) => {
                        processChunk(response)
                    })
                }
            }

            function processChunk(response) {
                downloaded = response
                library = library.concat(downloaded.data)
                self.library.downloadNotification.show = true
                self.library.downloadNotification.message = "Updating library albums..."
                self.library.downloadNotification.total = downloaded.meta.total
                self.library.downloadNotification.progress = library.length
                if (downloaded.meta.total == 0) {
                    self.library.albums.downloadState = 3
                    return
                }
                if (typeof downloaded.next == "undefined") {
                    console.log("downloaded.next is undefined")
                    self.library.albums.listing = library
                    self.library.albums.downloadState = 2
                    self.library.downloadNotification.show = false
                    localStorage.setItem("libraryAlbums", JSON.stringify(library))
                    self.searchLibraryAlbums(index)
                }
                if (downloaded.meta.total > library.length || typeof downloaded.meta.next != "undefined") {
                    console.log(`downloading next chunk - ${library.length
                    } albums so far`)
                    downloadChunk()
                } else {
                    self.library.albums.listing = library
                    self.library.albums.downloadState = 2
                    self.library.downloadNotification.show = false
                    localStorage.setItem("libraryAlbums", JSON.stringify(library))
                    self.searchLibraryAlbums(index)
                    console.log(library)
                }
            }

            downloadChunk()
        },
        // copy the getLibrarySongsFull function except change Songs to Albums
        async getLibraryArtistsFull(force = false, index) {
            let self = this
            let library = []
            let downloaded = null;
            if ((this.library.artists.downloadState == 2 || this.library.artists.downloadState == 1) && !force) {
                return
            }
            if (localStorage.getItem("libraryArtists") != null) {
                this.library.artists.listing = JSON.parse(localStorage.getItem("libraryArtists"))
                this.searchLibraryArtists(index)
            }
            if (this.songstest) {
                return
            }
            this.library.artists.downloadState = 1
            this.library.downloadNotification.show = true
            this.library.downloadNotification.message = "Updating library artists..."

            function downloadChunk() {
                self.library.artists.downloadState = 1
                const params = {
                    include: "catalog",
                    // "include[library-artists]": "catalog,artists,albums",
                    // "fields[artists]": "name,url,id",
                    // "fields[albums]": "name,url,id",
                    platform: "web",
                    // "fields[catalog]": "artistUrl,albumUrl",
                    // "fields[artists]": "artistName,artistUrl,artwork,contentRating,editorialArtwork,name,playParams,releaseDate,url",
                    limit: 100,
                }
                if (downloaded == null) {
                    app.mk.api.library.artists("", params, {includeResponseMeta: !0}).then((response) => {
                        processChunk(response)
                    })
                } else {
                    downloaded.next("", "artists", {includeResponseMeta: !0}).then((response) => {
                        processChunk(response)
                    })
                }
            }

            function processChunk(response) {
                downloaded = response
                library = library.concat(downloaded.data)
                self.library.downloadNotification.show = true
                self.library.downloadNotification.message = "Updating library artists..."
                self.library.downloadNotification.total = downloaded.meta.total
                self.library.downloadNotification.progress = library.length
                if (downloaded.meta.total == 0) {
                    self.library.albums.downloadState = 3
                    return
                }
                if (typeof downloaded.next == "undefined") {
                    console.log("downloaded.next is undefined")
                    self.library.artists.listing = library
                    self.library.artists.downloadState = 2
                    self.library.artists.show = false
                    localStorage.setItem("libraryArtists", JSON.stringify(library))
                    self.searchLibraryArtists(index)
                }
                if (downloaded.meta.total > library.length || typeof downloaded.meta.next != "undefined") {
                    console.log(`downloading next chunk - ${library.length
                    } artists so far`)
                    downloadChunk()
                } else {
                    self.library.artists.listing = library
                    self.library.artists.downloadState = 2
                    self.library.downloadNotification.show = false
                    localStorage.setItem("libraryArtists", JSON.stringify(library))
                    self.searchLibraryArtists(index)
                    console.log(library)
                }
            }

            downloadChunk()
        },
        getTotalTime() {
            try {
                if (app.showingPlaylist.relationships.tracks.data.length > 0) {
                    let time = Math.round([].concat(...app.showingPlaylist.relationships.tracks.data).reduce((a, {attributes: {durationInMillis}}) => a + durationInMillis, 0) / 1000);
                    let hours = Math.floor(time / 3600)
                    let mins = Math.floor(time / 60) % 60
                    let secs = time % 60
                    return app.showingPlaylist.relationships.tracks.data.length + " tracks, " + ((hours > 0) ? (hours + (" hour" + ((hours > 1) ? "s, " : ", "))) : "") + ((mins > 0) ? (mins + (" minute" + ((mins > 1) ? "s, " : ", "))) : "") + secs + (" second" + ((secs > 1) ? "s." : "."));
                } else return ""
            } catch (err) {
                return ""
            }
        },
        async getLibrarySongs() {
            let response = await this.mkapi("songs", true, "", {limit: 100}, {includeResponseMeta: !0})
            this.library.songs.listing = response.data
            this.library.songs.meta = response.meta
        },
        async getLibraryAlbums() {
            let response = await this.mkapi("albums", true, "", {limit: 100}, {includeResponseMeta: !0})
            this.library.albums.listing = response.data
            this.library.albums.meta = response.meta
        },
        async getListenNow(attempt = 0) {
            if (attempt > 3) {
                return
            }
            try {
                this.listennow = await this.mk.api.personalRecommendations("",
                    {
                        name: "listen-now",
                        with: "friendsMix,library,social",
                        "art[social-profiles:url]": "c",
                        "art[url]": "c,f",
                        "omit[resource]": "autos",
                        "relate[editorial-items]": "contents",
                        extend: ["editorialCard", "editorialVideo"],
                        "extend[albums]": ["artistUrl"],
                        "extend[library-albums]": ["artistUrl", "editorialVideo"],
                        "extend[playlists]": ["artistNames", "editorialArtwork", "editorialVideo"],
                        "extend[library-playlists]": ["artistNames", "editorialArtwork", "editorialVideo"],
                        "extend[social-profiles]": "topGenreNames",
                        "include[albums]": "artists",
                        "include[songs]": "artists",
                        "include[music-videos]": "artists",
                        "fields[albums]": ["artistName", "artistUrl", "artwork", "contentRating", "editorialArtwork", "editorialVideo", "name", "playParams", "releaseDate", "url"],
                        "fields[artists]": ["name", "url"],
                        "extend[stations]": ["airDate", "supportsAirTimeUpdates"],
                        "meta[stations]": "inflectionPoints",
                        types: "artists,albums,editorial-items,library-albums,library-playlists,music-movies,music-videos,playlists,stations,uploaded-audios,uploaded-videos,activities,apple-curators,curators,tv-shows,social-upsells",
                        platform: "web"
                    },
                    {
                        includeResponseMeta: !0,
                        reload: !0
                    });
                console.log(this.listennow)
            } catch (e) {
                console.log(e)
                this.getListenNow(attempt + 1)
            }
        },
        async getBrowsePage(attempt = 0) {
            if (attempt > 3) {
                return
            }
            try {
                let browse = await this.mk.api.groupings("",
                    {
                        platform: "web",
                        name: "music",
                        "omit[resource:artists]": "relationships",
                        "include[albums]": "artists",
                        "include[songs]": "artists",
                        "include[music-videos]": "artists",
                        extend: "editorialArtwork,artistUrl",
                        "fields[artists]": "name,url,artwork,editorialArtwork,genreNames,editorialNotes",
                        "art[url]": "f"
                    });
                this.browsepage = browse[0];
                console.log(this.browsepage)
            } catch (e) {
                console.log(e)
                this.getBrowsePage(attempt + 1)
            }
        },
        async getRadioStations(attempt = 0) {
            if (attempt > 3) {
                return
            }
            try {
                this.radio.personal = await this.mkapi("recentRadioStations", false, "",
                    {
                        "platform": "web",
                        "art[url]": "f"
                    });
            } catch (e) {
                console.log(e)
                this.getRadioStations(attempt + 1)
            }
        },
        async getMadeForYou(attempt = 0) {
            if (attempt > 3) {
                return
            }
            try {
                mfu = await app.mk.api.v3.music("/v1/me/library/playlists?platform=web&extend=editorialVideo&fields%5Bplaylists%5D=lastModifiedDate&filter%5Bfeatured%5D=made-for-you&include%5Blibrary-playlists%5D=catalog&fields%5Blibrary-playlists%5D=artwork%2Cname%2CplayParams%2CdateAdded")
                this.madeforyou = mfu.data
            } catch (e) {
                console.log(e)
                this.getMadeForYou(attempt + 1)
            }
        },
        newPlaylistFolder(name = "New Folder") {
            let self = this
            this.mk.api.v3.music(
                "/v1/me/library/playlist-folders/",
                {},
                {
                    fetchOptions: {
                        method: "POST",
                        body: JSON.stringify({
                            attributes: {name: name}
                        })
                    }
                }
            ).then((res) => {
                let playlist = (res.data.data[0])
                self.playlists.listing.push({
                    id: playlist.id,
                    attributes: {
                        name: playlist.attributes.name
                    },
                    type: "library-playlist-folders",
                    parent: "p.playlistsroot"
                })
                self.sortPlaylists()
                setTimeout(() => {
                    app.refreshPlaylists()
                }, 13000)
            })
        },
        unauthorize() {
            this.mk.unauthorize()
        },
        showSearch() {
            this.page = "search"
        },
        loadLyrics() {
            const musicType = (MusicKit.getInstance().nowPlayingItem != null) ? MusicKit.getInstance().nowPlayingItem["type"] ?? '' : '';
            console.log("mt", musicType)
            if (musicType === "musicVideo") {
                this.loadYTLyrics();
            } else {
                if (app.cfg.lyrics.enable_mxm) {
                    this.loadMXM();
                } else {
                    this.loadAMLyrics();
                }
            }
        },
        loadAMLyrics() {
            const songID = (this.mk.nowPlayingItem != null) ? this.mk.nowPlayingItem["_songId"] ?? -1 : -1;
            // this.getMXM( trackName, artistName, 'en', duration);
            if (songID != -1) {
                MusicKit.getInstance().api.lyric(songID)
                    .then((response) => {
                        this.lyricsMediaItem = response.attributes["ttml"]
                        this.parseTTML()
                    })
            }
        },
        addToLibrary(id) {
            let self = this
            this.mk.addToLibrary(id).then((data) => {
                self.getLibrarySongsFull(true)
            })
        },
        removeFromLibrary(kind, id) {
            let self = this
            let truekind = (!kind.endsWith("s")) ? (kind + "s") : kind;
            this.mk.api.library.remove({[truekind]: id}).then((data) => {
                self.getLibrarySongsFull(true)
            })
        },
        async loadYTLyrics() {
            const track = (this.mk.nowPlayingItem != null) ? this.mk.nowPlayingItem.title ?? '' : '';
            const artist = (this.mk.nowPlayingItem != null) ? this.mk.nowPlayingItem.artistName ?? '' : '';
            const time = (this.mk.nowPlayingItem != null) ? (Math.round((this.mk.nowPlayingItem.attributes["durationInMillis"] ?? -1000) / 1000) ?? -1) : -1;
            ipcRenderer.invoke('getYTLyrics', track, artist).then((result) => {
                if (result.length > 0) {
                    let ytid = result[0]['id']['videoId'];
                    if (app.cfg.lyrics.enable_yt) {
                        loadYT(ytid, app.cfg.lyrics.mxm_language ?? "en")
                    } else {
                        app.loadMXM()
                    }
                } else {
                    app.loadMXM()
                }

                function loadYT(id, lang) {
                    let req = new XMLHttpRequest();
                    let url = `https://www.youtube.com/watch?&v=${id}`;
                    req.open('GET', url, true);
                    req.onerror = function (e) {
                        this.loadMXM();
                    }
                    req.onload = function () {
                        // console.log(this.responseText);
                        res = this.responseText;
                        let captionurl1 = res.substring(res.indexOf(`{"playerCaptionsRenderer":{"baseUrl":"`) + (`{"playerCaptionsRenderer":{"baseUrl":"`).length);
                        let captionurl = captionurl1.substring(0, captionurl1.indexOf(`"`));
                        if (captionurl.includes("timedtext")) {
                            let json = JSON.parse(`{"url": "${captionurl}"}`);
                            let newurl = json.url + `&lang=${lang}&format=ttml`

                            let req2 = new XMLHttpRequest();

                            req2.open('GET', newurl, true);
                            req2.onerror = function (e) {
                                app.loadMXM();
                            }
                            req2.onload = function () {
                                try {
                                    const ttmlLyrics = this.responseText;
                                    if (ttmlLyrics) {
                                        this.lyricsMediaItem = ttmlLyrics
                                        this.parseTTML()
                                    }
                                } catch (e) {
                                    app.loadMXM();
                                }

                            }
                            req2.send();
                        } else {

                            app.loadMXM();

                        }
                    }
                    req.send();
                }

            })

        },
        loadMXM() {
            let attempt = 0;
            const track = encodeURIComponent((this.mk.nowPlayingItem != null) ? this.mk.nowPlayingItem.title ?? '' : '');
            const artist = encodeURIComponent((this.mk.nowPlayingItem != null) ? this.mk.nowPlayingItem.artistName ?? '' : '');
            const time = encodeURIComponent((this.mk.nowPlayingItem != null) ? (Math.round((this.mk.nowPlayingItem.attributes["durationInMillis"] ?? -1000) / 1000) ?? -1) : -1);
            let lrcfile = "";
            let richsync = [];
            const lang = app.cfg.lyrics.mxm_language //  translation language
            function revisedRandId() {
                return Math.random().toString(36).replace(/[^a-z]+/g, '').substr(2, 10);
            }

            /* get token */
            function getToken(mode, track, artist, songid, lang, time) {
                if (attempt > 2) {
                    app.loadAMLyrics();
                } else {
                    attempt = attempt + 1;
                    let url = "https://apic-desktop.musixmatch.com/ws/1.1/token.get?app_id=web-desktop-app-v1.0&t=" + revisedRandId();
                    let req = new XMLHttpRequest();
                    req.overrideMimeType("application/json");
                    req.open('GET', url, true);
                    req.setRequestHeader("authority", "apic-desktop.musixmatch.com");
                    req.onload = function () {
                        let jsonResponse = JSON.parse(this.responseText);
                        let status2 = jsonResponse["message"]["header"]["status_code"];
                        if (status2 == 200) {
                            let token = jsonResponse["message"]["body"]["user_token"] ?? '';
                            if (token != "" && token != "UpgradeOnlyUpgradeOnlyUpgradeOnlyUpgradeOnly") {
                                console.log('200 token', mode);
                                // token good
                                app.mxmtoken = token;

                                if (mode == 1) {
                                    getMXMSubs(track, artist, app.mxmtoken, lang, time);
                                } else {
                                    getMXMTrans(songid, lang, app.mxmtoken);
                                }
                            } else {
                                console.log('fake 200 token');
                                getToken(mode, track, artist, songid, lang, time)
                            }
                        } else {
                            console.log('token 4xx');
                            getToken(mode, track, artist, songid, lang, time)
                        }

                    };
                    req.onerror = function () {
                        console.log('error');
                        app.loadAMLyrics();
                    };
                    req.send();
                }
            }

            function getMXMSubs(track, artist, token, lang, time) {
                let usertoken = encodeURIComponent(token);
                let richsyncQuery = (app.cfg.lyrics.mxm_karaoke) ? "&optional_calls=track.richsync" : ""
                let timecustom = (!time || (time && time < 0)) ? '' : `&f_subtitle_length=${time}&q_duration=${time}&f_subtitle_length_max_deviation=40`;
                let url = "https://apic-desktop.musixmatch.com/ws/1.1/macro.subtitles.get?format=json&namespace=lyrics_richsynched" + richsyncQuery + "&subtitle_format=lrc&q_artist=" + artist + "&q_track=" + track + "&usertoken=" + usertoken + timecustom + "&app_id=web-desktop-app-v1.0&t=" + revisedRandId();
                let req = new XMLHttpRequest();
                req.overrideMimeType("application/json");
                req.open('GET', url, true);
                req.setRequestHeader("authority", "apic-desktop.musixmatch.com");
                req.onload = function () {
                    let jsonResponse = JSON.parse(this.responseText);
                    console.log(jsonResponse);
                    let status1 = jsonResponse["message"]["header"]["status_code"];

                    if (status1 == 200) {
                        let id = '';
                        try {
                            if (jsonResponse["message"]["body"]["macro_calls"]["matcher.track.get"]["message"]["header"]["status_code"] == 200 && jsonResponse["message"]["body"]["macro_calls"]["track.subtitles.get"]["message"]["header"]["status_code"] == 200) {
                                id = jsonResponse["message"]["body"]["macro_calls"]["matcher.track.get"]["message"]["body"]["track"]["track_id"] ?? '';
                                lrcfile = jsonResponse["message"]["body"]["macro_calls"]["track.subtitles.get"]["message"]["body"]["subtitle_list"][0]["subtitle"]["subtitle_body"];

                                try {
                                    lrcrich = jsonResponse["message"]["body"]["macro_calls"]["track.richsync.get"]["message"]["body"]["richsync"]["richsync_body"];
                                    richsync = JSON.parse(lrcrich);
                                    app.richlyrics = richsync;
                                } catch (_) {
                                }
                            }

                            if (lrcfile == "") {
                                app.loadAMLyrics()
                            } else {
                                if (richsync == [] || richsync.length == 0) {
                                    console.log("ok");
                                    // process lrcfile to json here
                                    app.lyricsMediaItem = lrcfile
                                    let u = app.lyricsMediaItem.split(/[\r\n]/);
                                    let preLrc = []
                                    for (var i = u.length - 1; i >= 0; i--) {
                                        let xline = (/(\[[0-9.:\[\]]*\])+(.*)/).exec(u[i])
                                        let end = (preLrc.length > 0) ? ((preLrc[preLrc.length - 1].startTime) ?? 99999) : 99999
                                        preLrc.push({
                                            startTime: app.toMS(xline[1].substring(1, xline[1].length - 2)) ?? 0,
                                            endTime: end,
                                            line: xline[2],
                                            translation: ''
                                        })
                                    }
                                    if (preLrc.length > 0)
                                        preLrc.push({
                                            startTime: 0,
                                            endTime: preLrc[preLrc.length - 1].startTime,
                                            line: "lrcInstrumental",
                                            translation: ''
                                        });
                                    app.lyrics = preLrc.reverse();
                                } else {
                                    preLrc = richsync.map(function (item) {
                                        return {
                                            startTime: item.ts,
                                            endTime: item.te,
                                            line: item.x,
                                            translation: ''
                                        }
                                    })
                                    if (preLrc.length > 0)
                                        preLrc.unshift({
                                            startTime: 0,
                                            endTime: preLrc[0].startTime,
                                            line: "lrcInstrumental",
                                            translation: ''
                                        });
                                    app.lyrics = preLrc;
                                }
                                if (lrcfile != null && lrcfile != '' && lang != "disabled") {
                                    // load translation
                                    getMXMTrans(id, lang, token);
                                } else {
                                    app.loadAMLyrics()
                                }
                            }
                        } catch (e) {
                            console.log(e);
                            app.loadAMLyrics()
                        }
                    } else { //4xx rejected
                        getToken(1, track, artist, '', lang, time);
                    }
                }
                req.send();
            }

            function getMXMTrans(id, lang, token) {
                if (lang != "disabled" && id != '') {
                    let usertoken = encodeURIComponent(token);
                    let url2 = "https://apic-desktop.musixmatch.com/ws/1.1/crowd.track.translations.get?translation_fields_set=minimal&selected_language=" + lang + "&track_id=" + id + "&comment_format=text&part=user&format=json&usertoken=" + usertoken + "&app_id=web-desktop-app-v1.0&t=" + revisedRandId();
                    let req2 = new XMLHttpRequest();
                    req2.overrideMimeType("application/json");
                    req2.open('GET', url2, true);
                    req2.setRequestHeader("authority", "apic-desktop.musixmatch.com");
                    req2.onload = function () {
                        let jsonResponse2 = JSON.parse(this.responseText);
                        console.log(jsonResponse2);
                        let status2 = jsonResponse2["message"]["header"]["status_code"];
                        if (status2 == 200) {
                            try {
                                let preTrans = []
                                let u = app.lyrics;
                                let translation_list = jsonResponse2["message"]["body"]["translations_list"];
                                if (translation_list.length > 0) {
                                    for (var i = 0; i < u.length - 1; i++) {
                                        preTrans[i] = ""
                                        for (var trans_line of translation_list) {
                                            if (u[i].line == " " + trans_line["translation"]["matched_line"] || u[i].line == trans_line["translation"]["matched_line"]) {
                                                u[i].translation = trans_line["translation"]["description"];
                                                break;
                                            }
                                        }
                                    }
                                    app.lyrics = u;
                                }
                            } catch (e) {
                                /// not found trans -> ignore		
                            }
                        } else { //4xx rejected
                            getToken(2, '', '', id, lang, '');
                        }
                    }
                    req2.send();
                }

            }

            if (track != "" & track != "No Title Found") {
                if (app.mxmtoken != null && app.mxmtoken != '') {
                    getMXMSubs(track, artist, app.mxmtoken, lang, time)
                } else {
                    getToken(1, track, artist, '', lang, time);
                }
            }
        },
        toMS(str) {
            let rawTime = str.match(/(\d+:)?(\d+:)?(\d+)(\.\d+)?/);
            let hours = (rawTime[2] != null) ? (rawTime[1].replace(":", "")) : 0;
            let minutes = (rawTime[2] != null) ? (hours * 60 + rawTime[2].replace(":", "") * 1) : ((rawTime[1] != null) ? rawTime[1].replace(":", "") : 0);
            let seconds = (rawTime[3] != null) ? (rawTime[3]) : 0;
            let milliseconds = (rawTime[4] != null) ? (rawTime[4].replace(".", "")) : 0
            return parseFloat(`${minutes * 60 + seconds * 1}.${milliseconds * 1}`);
        },
        parseTTML() {
            this.lyrics = [];
            let preLrc = [];
            let xml = this.stringToXml(this.lyricsMediaItem);
            let lyricsLines = xml.getElementsByTagName('p');
            let synced = true;
            let endTimes = [];
            if (xml.getElementsByTagName('tt')[0].getAttribute("itunes:timing") === "None") {
                synced = false;
            }
            endTimes.push(0);
            if (synced) {
                for (element of lyricsLines) {
                    start = this.toMS(element.getAttribute('begin'))
                    end = this.toMS(element.getAttribute('end'))
                    if (start - endTimes[endTimes.length - 1] > 5 && endTimes[endTimes.length - 1] != 0) {
                        preLrc.push({
                            startTime: endTimes[endTimes.length - 1],
                            endTime: start,
                            line: "lrcInstrumental"
                        });
                    }
                    preLrc.push({startTime: start, endTime: end, line: element.textContent});
                    endTimes.push(end);
                }
                // first line dot
                if (preLrc.length > 0)
                    preLrc.unshift({startTime: 0, endTime: preLrc[0].startTime, line: "lrcInstrumental"});
            } else {
                for (element of lyricsLines) {
                    preLrc.push({startTime: 9999999, endTime: 9999999, line: element.textContent});
                }
            }
            this.lyrics = preLrc;

        },
        parseLyrics() {
            let xml = this.stringToXml(this.lyricsMediaItem)
            let json = xmlToJson(xml);
            this.lyrics = json
        },
        stringToXml(st) {
            // string to xml
            let xml = (new DOMParser()).parseFromString(st, "text/xml");
            return xml;

        },
        getCurrentTime() {
            return parseFloat(this.hmsToSecondsOnly(this.parseTime(this.mk.nowPlayingItem.attributes.durationInMillis - app.mk.currentPlaybackTimeRemaining * 1000)));
        },
        seekTo(time) {
            this.mk.seekToTime(time);
        },
        parseTime(value) {
            let minutes = Math.floor(value / 60000);
            let seconds = ((value % 60000) / 1000).toFixed(0);
            return minutes + ":" + (seconds < 10 ? '0' : '') + seconds;
        },
        parseTimeDecimal(value) {
            let minutes = Math.floor(value / 60000);
            let seconds = ((value % 60000) / 1000).toFixed(0);
            return minutes + "." + (seconds < 10 ? '0' : '') + seconds;
        },
        hmsToSecondsOnly(str) {
            let p = str.split(':'),
                s = 0,
                m = 1;

            while (p.length > 0) {
                s += m * parseInt(p.pop(), 10);
                m *= 60;
            }

            return s;
        },
        getLyricBGStyle(start, end) {
            let currentTime = this.getCurrentTime();
            // let duration = this.mk.nowPlayingItem.attributes.durationInMillis
            let start2 = this.hmsToSecondsOnly(start)
            let end2 = this.hmsToSecondsOnly(end)
            // let currentProgress = ((100 * (currentTime)) / (end2))
            // check if currenttime is between start and end
            this.player.lyricsDebug.start = start2
            this.player.lyricsDebug.end = end2
            this.player.lyricsDebug.current = currentTime
            if (currentTime >= start2 && currentTime <= end2) {
                return {
                    "--bgSpeed": `${(end2 - start2)}s`
                }
            } else {
                return {}
            }
        },
        playMediaItemById(id, kind, isLibrary, raurl = "") {
            let truekind = (!kind.endsWith("s")) ? (kind + "s") : kind;
            console.log(id, truekind, isLibrary)
            try {
                if (truekind.includes("artist")) {
                    app.mk.setStationQueue({artist: 'a-' + id}).then(() => {
                        app.mk.play()
                    })
                } else if (truekind == "radioStations") {
                    this.mk.setStationQueue({url: raurl}).then(function (queue) {
                        MusicKit.getInstance().play()
                    });
                } else {
                    this.mk.setQueue({[truekind]: [id]}).then(function (queue) {
                        MusicKit.getInstance().play()
                    })
                }
            } catch (err) {
                console.log(err)
                this.playMediaItemById(id, kind, isLibrary, raurl)
            }
        },
        queueParentandplayChild(parent, childIndex, item) {
            let kind = parent.substring(0, parent.indexOf(":"))
            let id = parent.substring(parent.indexOf(":") + 1, parent.length)
            let truekind = (!kind.endsWith("s")) ? (kind + "s") : kind;
            console.log(truekind, id)

            try {
                if (app.library.songs.listing.length > childIndex && parent == "librarysongs") {
                    console.log(item)
                    if (item && ((app.library.songs.listing[childIndex].id != item.id))) {
                        childIndex = app.library.songs.listing.indexOf(item)
                    }

                    let query = app.library.songs.listing.map(item => new MusicKit.MediaItem(item));
                    try {
                        app.mk.stop()
                    } catch (e) {
                    }
                    this.mk.clearQueue().then(function (_) {
                        app.mk.queue.append(query)
                        if (childIndex != -1) {
                            app.mk.changeToMediaAtIndex(childIndex)
                        } else if (item) {
                            app.mk.playNext({[item.attributes.playParams.kind ?? item.type]: item.attributes.playParams.id ?? item.id}).then(function () {
                                app.mk.changeToMediaAtIndex(app.mk.queue._itemIDs.indexOf(item.id) ?? 1)
                                app.mk.play()
                            })
                        } else {
                            app.mk.play()
                        }
                    })
                } else {
                    try {
                        app.mk.stop()
                    } catch (e) {
                    }
                    if (truekind == "playlists" && (id.startsWith("p.") || id.startsWith("pl.u"))){
                        app.mk.playNext({[item.attributes.playParams.kind ?? item.type]: item.attributes.playParams.id ?? item.id}).then(function () {
                            app.mk.changeToMediaAtIndex(app.mk.queue._itemIDs.indexOf(item.id) ?? 1)
                            app.mk.play().then(function(){
                                app.mk.clearQueue().then(function () {
                                    if ((app.showingPlaylist && app.showingPlaylist.id == id)) {
                                        let query = app.showingPlaylist.relationships.tracks.data.map(item => new MusicKit.MediaItem(item));
                                        app.mk.queue.append(query)
                                    } else {
                                        app.getPlaylistFromID(id, true).then(function () {
                                            let query = app.showingPlaylist.relationships.tracks.data.map(item => new MusicKit.MediaItem(item));
                                            app.mk.queue.append(query)
                                        })
                                    }
                                })
                            })
                            
                        })                       
                    }
                    else{
                    this.mk.setQueue({[truekind]: [id]}).then(function (queue) {
                        if (item && ((queue._itemIDs[childIndex] != item.id))) {
                            childIndex = queue._itemIDs.indexOf(item.id)
                        }
                        if (childIndex != -1) {
                            app.mk.changeToMediaAtIndex(childIndex)
                        } else if (item) {
                            app.mk.playNext({[item.attributes.playParams.kind ?? item.type]: item.attributes.playParams.id ?? item.id}).then(function () {
                                app.mk.changeToMediaAtIndex(app.mk.queue._itemIDs.indexOf(item.id) ?? 1)
                                app.mk.play()
                            })
                        } else {
                            app.mk.play()
                        }
                    })}
                }
            } catch (err) {
                console.log(err)
                try {
                    app.mk.stop()
                } catch (e) {
                }
                this.playMediaItemById(item.attributes.playParams.id ?? item.id, item.attributes.playParams.kind ?? item.type, item.attributes.playParams.isLibrary ?? false, item.attributes.url)
            }

        },
        friendlyTypes(type) {
            // use switch statement to return friendly name for media types "songs,artists,albums,playlists,music-videos,stations,apple-curators,curators"
            switch (type) {
                case "song":
                    return "Songs"
                    break;
                case "artist":
                    return "Artists"
                    break;
                case "album":
                    return "Albums"
                    break;
                case "playlist":
                    return "Playlists"
                    break;
                case "music_video":
                    return "Music Videos"
                    break;
                case "station":
                    return "Stations"
                    break;
                case "apple-curator":
                    return "Apple Curators"
                    break;
                case "radio_show":
                    return "Radio Shows"
                    break;
                case "record_label":
                    return "Record Labels"
                    break;
                case "radio_episode":
                    return "Episodes"
                    break;
                case "video_extra":
                    return "Video Extras"
                    break;
                case "curator":
                    return "Curators"
                    break;
                case "top":
                    return "Top"
                    break;
                default:
                    return type
                    break;
            }
        },
        async searchQuery(term = this.search.term) {
            let self = this
            if (term == "") {
                return
            }
            this.mk.api.search(this.search.term,
                {
                    types: "activities,albums,apple-curators,artists,curators,editorial-items,music-movies,music-videos,playlists,songs,stations,tv-episodes,uploaded-videos,record-labels",
                    "relate[editorial-items]": "contents",
                    "include[editorial-items]": "contents",
                    "include[albums]": "artists",
                    "include[artists]": "artists",
                    "include[songs]": "artists,albums",
                    "include[music-videos]": "artists",
                    "extend": "artistUrl",
                    "fields[artists]": "url,name,artwork,hero",
                    "fields[albums]": "artistName,artistUrl,artwork,contentRating,editorialArtwork,name,playParams,releaseDate,url",
                    "with": "serverBubbles,lyricHighlights",
                    "art[url]": "c,f",
                    "omit[resource]": "autos",
                    "platform": "web",
                    limit: 25
                }).then(function (results) {
                self.search.results = results
            })
            await this.mk.api.socialSearch(this.search.term, {
                types: ["playlists", "social-profiles"],
                limit: 25,
                with: ["serverBubbles", "lyricSnippet"],
                "art[url]": "f",
                "art[social-profiles:url]": "c"
            }, {includeResponseMeta: !0}).then(function (results) {
                self.search.resultsSocial = results
            })
        },
        async inLibrary(items = []) {
            let types = []

            for (let item of items) {
                let type = item.type
                if (type.slice(-1) != "s") {
                    type += "s"
                }
                let id = item.playParams.catalogId ? item.playParams.catalogId : item.id

                let index = types.findIndex(function (type) {
                    return type.type == this
                }, type)
                if (index == -1) {
                    types.push({type: type, id: [id]})
                } else {
                    types[index].id.push(id)
                }
            }
            return await this.mk.api.catalogResources(types, {"omit[resource]": "autos", relate: "library", fields: "inLibrary"})
        },
        isInLibrary(playParams) {
            let self = this
            let id = ""
            // ugly code to check if current playback item is in library
            if (typeof playParams == "undefined") {
                return true
            }
            if (playParams["isLibrary"]) {
                return true
            } else if (playParams["catalogId"]) {
                id = playParams["catalogId"]
            } else if (playParams["id"]) {
                id = playParams["id"]
            }
            let found = this.library.songs.listing.filter((item) => {
                if (item["attributes"]) {
                    if (item["attributes"]["playParams"] && (item["attributes"]["playParams"]["catalogId"] == id)) {
                        return item;
                    }
                }
            })
            if (found.length != 0) {
                return true
            } else {
                return false
            }
        },
        mkReady() {
            if (this.mk["nowPlayingItem"]) {
                return true
            } else {
                return false
            }
        },
        getMediaItemArtwork(url, height = 64, width) {
            if(typeof url == "undefined" || url == "") {
                return "https://beta.music.apple.com/assets/product/MissingArtworkMusic.svg"
            }
            let newurl = `${url.replace('{w}', width ?? height).replace('{h}', height).replace('{f}', "webp").replace('{c}', ((width === 900) ? "sr" : "cc"))}`;

            if (newurl.includes("900x516")) {
                newurl = newurl.replace("900x516cc", "900x516sr").replace("900x516bb", "900x516sr");
            }
            return newurl
        },
        _rgbToRgb(rgb = [0,0,0]) {
            // if rgb
            return `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`
        },
        getNowPlayingArtworkBG(size = 600) {
            let self = this
            if (typeof this.mk.nowPlayingItem === "undefined") return;
            let bginterval = setInterval(() => {
                if (!this.mkReady()) {
                    return ""
                }

                try {
                    if (this.mk.nowPlayingItem && this.mk.nowPlayingItem["id"] != this.currentTrackID && document.querySelector('.bg-artwork')) {
                        if (document.querySelector('.bg-artwork')) {
                            clearInterval(bginterval);
                        }
                        this.currentTrackID = this.mk.nowPlayingItem["id"];
                        document.querySelector('.bg-artwork').src = "";
                        if (this.mk["nowPlayingItem"]["attributes"]["artwork"]["url"]) {
                            getBase64FromUrl(this.mk["nowPlayingItem"]["attributes"]["artwork"]["url"].replace('{w}', size).replace('{h}', size)).then(img =>{
                                document.querySelectorAll('.bg-artwork').forEach(artwork => {
                                    artwork.src = img;
                                })
                                self.$store.commit("setLCDArtwork", img)
                            })

                            // Vibrant.from(this.mk["nowPlayingItem"]["attributes"]["artwork"]["url"].replace('{w}', size).replace('{h}', size)).getPalette().then(palette=>{
                            //     let angle = "140deg"
                            //     let gradient = ""
                            //     let colors = Object.values(palette).filter(color=>color!=null)
                            //     if(colors.length > 0){
                            //         let stops = []
                            //         colors.forEach(color=>{
                            //             stops.push(`${self._rgbToRgb(color._rgb)} 0%`)
                            //         })
                            //         stops.push(`${self._rgbToRgb(colors[0]._rgb)} 100%`)
                            //         gradient = `linear-gradient(${angle}, ${stops.join(", ")}`
                            //     }
                            //
                            //     document.querySelector("#app").style.setProperty("--bgColor", gradient)
                            // }).setQuantizer(Vibrant.Quantizer.WebWorker)

                            try {
                                clearInterval(bginterval);
                            } catch (err) {
                            }
                        } else {
                            this.setLibraryArtBG()
                        }
                    } else if (this.mk.nowPlayingItem["id"] == this.currentTrackID) {
                        try {
                            clearInterval(bginterval);
                        } catch (err) {
                        }
                    }
                } catch (e) {
                    if (this.mk.nowPlayingItem && this.mk.nowPlayingItem["id"] && document.querySelector('.bg-artwork')) {
                        this.setLibraryArtBG()
                        try {
                            clearInterval(bginterval);
                        } catch (err) {
                        }
                    }
                }
            }, 200)
        },

        // getNowPlayingArtwork(size = 600) {
        //     if (typeof this.mk.nowPlayingItem === "undefined") return;
        //     let interval = setInterval(() => {

        //         try {
        //             if (this.mk.nowPlayingItem && this.mk.nowPlayingItem["id"] != this.currentTrackIDBG && document.querySelector('.app-playback-controls .artwork')) {
        //                 this.currentTrackIDBG = this.mk.nowPlayingItem["id"];
        //                 if (document.querySelector('.app-playback-controls .artwork') != null) {
        //                     clearInterval(interval);
        //                 }
        //                 if (app.mk.nowPlayingItem.attributes.artwork != null && app.mk.nowPlayingItem.attributes.artwork.url != null && app.mk.nowPlayingItem.attributes.artwork.url!= '' ) {
        //                     document.querySelector('.app-playback-controls .artwork').style.setProperty('--artwork', `url("${decodeURI((this.mk["nowPlayingItem"]["attributes"]["artwork"]["url"])).replace('{w}', size).replace('{h}', size)}")`);
        //                     try {
        //                         clearInterval(interval);
        //                     } catch (err) {
        //                     }
        //                 } else {
        //                     this.setLibraryArt()
        //                 }
        //             } else if (this.mk.nowPlayingItem["id"] == this.currentTrackID) {
        //                 try {
        //                     clearInterval(interval);
        //                 } catch (err) {
        //                 }
        //             }
        //         } catch (e) {
        //             if (this.mk.nowPlayingItem && this.mk.nowPlayingItem["id"] && document.querySelector('.app-playback-controls .artwork')) {
        //                 this.setLibraryArt()
        //                 try {
        //                     clearInterval(interval);
        //                 } catch (err) {
        //                 }

        //             }

        //         }
        //     }, 200)


        // },
        async getCurrentArtURL(){
            try{
                this.currentArtUrl = '';
                if (app.mk.nowPlayingItem != null && app.mk.nowPlayingItem.attributes != null && app.mk.nowPlayingItem.attributes.artwork != null && app.mk.nowPlayingItem.attributes.artwork.url != null && app.mk.nowPlayingItem.attributes.artwork.url!= '' ) 
                {
                    this.currentArtUrl = (this.mk["nowPlayingItem"]["attributes"]["artwork"]["url"] ?? '').replace('{w}', 50).replace('{h}', 50);
                    try{
                    document.querySelector('.app-playback-controls .artwork').style.setProperty('--artwork', `url("${this.currentArtUrl}")`);}
                    catch (e) {}
                } else {
                    let data = await this.mk.api.library.song(this.mk.nowPlayingItem.id);
                    if (data != null && data !== "" && data.attributes != null && data.attributes.artwork != null) {
                        this.currentArtUrl = (data["attributes"]["artwork"]["url"] ?? '').replace('{w}', 50).replace('{h}', 50);
                        try{
                            document.querySelector('.app-playback-controls .artwork').style.setProperty('--artwork', `url("${this.currentArtUrl}")`);}
                        catch (e) {}
                    } else {this.currentArtUrl = '';
                    try{
                        document.querySelector('.app-playback-controls .artwork').style.setProperty('--artwork', `url("${this.currentArtUrl}")`);}
                    catch (e) {}
                }
                }
            }catch(e){

            }
        },
        async setLibraryArt() {
            if (typeof this.mk.nowPlayingItem === "undefined") return;
            const data = await this.mk.api.library.song(this.mk.nowPlayingItem["id"])
            try {
                const data = await this.mk.api.library.song(this.mk.nowPlayingItem.id)

                if (data != null && data !== "") {
                    document.querySelector('.app-playback-controls .artwork').style.setProperty('--artwork', 'url("' + (data["attributes"]["artwork"]["url"]).toString() + '")');
                } else {
                    document.querySelector('.app-playback-controls .artwork').style.setProperty('--artwork', `url("")`);
                }
            } catch (e) {
            }
        },
        async setLibraryArtBG() {
            if (typeof this.mk.nowPlayingItem === "undefined") return;
            const data = await this.mk.api.library.song(this.mk.nowPlayingItem["id"])
            try {
                const data = await this.mk.api.library.song(this.mk.nowPlayingItem.id)

                if (data != null && data !== "") {
                    getBase64FromUrl((data["attributes"]["artwork"]["url"]).toString()).then(img =>{
                        document.querySelector('.bg-artwork').forEach(artwork => {
                            artwork.src = img;
                        })
                        self.$store.commit("setLCDArtwork", img)
                    })
                }
            } catch (e) {
            }

        },
        quickPlay(query) {
            let self = this
            MusicKit.getInstance().api.search(query, {limit: 2, types: 'songs'}).then(function (data) {
                MusicKit.getInstance().setQueue({song: data["songs"]['data'][0]["id"]}).then(function (queue) {
                    MusicKit.getInstance().play()
                    setTimeout(() => {
                        self.$forceUpdate()
                    }, 1000)
                })
            })
        },
        async getRating(item) {
            let type = item.type.slice(-1) === "s" ? item.type : item.type + "s"
            let id = item.attributes.playParams.catalogId ? item.attributes.playParams.catalogId : item.id
            if (item.id.startsWith("i.")) {
                if(!type.startsWith("library-")) {
                    type = "library-" + type
                }
                id = item.id
            }
            let response = await this.mk.api.v3.music(`/v1/me/ratings/${type}?platform=web&ids=${id}`)
            if(response.data.data.length != 0) {
                let value = response.data.data[0].attributes.value
                return value
            }else{
                return 0
            }
        },
        love(item) {
            let type = item.type.slice(-1) === "s" ? item.type : item.type + "s"
            let id = item.attributes.playParams.catalogId ? item.attributes.playParams.catalogId : item.id
            if (item.id.startsWith("i.")) {
                if(!type.startsWith("library-")) {
                    type = "library-" + type
                }
                id = item.id
            }
            this.mk.api.v3.music(`/v1/me/ratings/${type}/${id}`, {}, {
                fetchOptions:
                    {
                        method: "PUT",
                        body: JSON.stringify(
                            {
                                "type": "rating",
                                "attributes": {
                                    "value": 1
                                }
                            }
                        )
                    }
            })
        },
        dislike(item) {
            let type = item.type.slice(-1) === "s" ? item.type : item.type + "s"
            let id = item.attributes.playParams.catalogId ? item.attributes.playParams.catalogId : item.id
            if (item.id.startsWith("i.")) {
                if(!type.startsWith("library-")) {
                    type = "library-" + type
                }
                id = item.id
            }
            this.mk.api.v3.music(`/v1/me/ratings/${type}/${id}`, {}, {
                fetchOptions:
                    {
                        method: "PUT",
                        body: JSON.stringify(
                            {
                                "type": "rating",
                                "attributes": {
                                    "value": -1
                                }
                            }
                        )
                    }
            })
        },
        unlove(item) {
            let type = item.type.slice(-1) === "s" ? item.type : item.type + "s"
            let id = item.attributes.playParams.catalogId ? item.attributes.playParams.catalogId : item.id
            if (item.id.startsWith("i.")) {
                if(!type.startsWith("library-")) {
                    type = "library-" + type
                }
                id = item.id
            }
            this.mk.api.v3.music(`/v1/me/ratings/${type}/${id}`, {}, {
                fetchOptions:
                    {
                        method: "DELETE",
                    }
            })
        },
        volumeWheel(event) {
            if (event.deltaY < 0) {
                if(this.mk.volume < 1){
                    if (this.mk.volume <= 0.9) {
                        this.mk.volume += 0.1
                    } else { this.mk.volume = 1 }
                }
            } else if (event.deltaY > 0) {
                if(this.mk.volume > 0){
                    if (this.mk.volume >= 0.1){
                    this.mk.volume -= 0.1
                    } else {this.mk.volume = 0}
                }
            }
        },
        async apiCall(url, callback) {
            const xmlHttp = new XMLHttpRequest();

            xmlHttp.onreadystatechange = (e) => {
                if (xmlHttp.readyState !== 4) {
                    return;
                }

                if (xmlHttp.status === 200) {
                    // console.log('SUCCESS', xmlHttp.responseText);
                    callback(JSON.parse(xmlHttp.responseText));
                } else {
                    console.warn('request_error');
                }
            };

            xmlHttp.open("GET", url);
            xmlHttp.setRequestHeader("Authorization", "Bearer " + MusicKit.getInstance().developerToken);
            xmlHttp.setRequestHeader("Music-User-Token", "" + MusicKit.getInstance().musicUserToken);
            xmlHttp.setRequestHeader("Accept", "application/json");
            xmlHttp.setRequestHeader("Content-Type", "application/json");
            xmlHttp.responseType = "text";
            xmlHttp.send();
        },
        fetchPlaylist(id, callback) {
            // id can be found in playlist.attributes.playParams.globalId
            this.mk.api.playlist(id).then(res => {
                callback(res)
            })

            // tracks are found in relationship.data
        },
        windowFocus(val) {
            if (val) {
                document.querySelectorAll(".animated-artwork-video").forEach(el => {
                    el.play()
                })
                this.animateBackground = true
            } else {
                document.querySelectorAll(".animated-artwork-video").forEach(el => {
                    el.pause()
                })
                this.animateBackground = false
            }
        },
        async nowPlayingContextMenu(event) {
            // function revisedRandId() {
            //     return Math.random().toString(36).replace(/[^a-z]+/g, '').substr(2, 10);
            // }
            let self = this
            let data_type = this.mk.nowPlayingItem.playParams.kind
            let item_id = this.mk.nowPlayingItem.attributes.playParams.id ?? this.mk.nowPlayingItem.id
            let isLibrary = this.mk.nowPlayingItem.attributes.playParams.isLibrary ?? false
            let params = {"fields[songs]": "inLibrary", "fields[albums]": "inLibrary", "relate": "library", "t": "1"}
            // let res = await app.mkapi(data_type, isLibrary , item_id, params);
            // if (res && res.relationships && res.relationships.library && res.relationships.library.data && res.relationships.library.data.length > 0) {
            //     item_id = res.relationships.library.data[0].id
            // }
            app.selectedMediaItems = []
            app.select_selectMediaItem(item_id, data_type, 0, '12344', isLibrary)
            let useMenu = "normal"
            let menus = {
                multiple: {
                    items: []
                },
                normal: {
                    items: [
                        {
                            "icon": "./assets/feather/list.svg",
                            "name": "Add to Playlist...",
                            "action": function () {
                                app.promptAddToPlaylist()
                            }
                        },
                        {
                            "icon": "./assets/feather/plus.svg",
                            "id": "addToLibrary",
                            "name": "Add to Library...",
                            "disabled": false,
                            "action": function () {
                                app.addToLibrary(item_id);
                                //   if (!isLibrary)  {app.addToLibrary(item_id); this.mk.nowPlayingItem.attributes.playParams["isLibrary"] = true} else { app.removeFromLibrary(data_type,item_id); this.mk.nowPlayingItem.attributes.playParams["isLibrary"] = false};
                            }
                        },
                        {
                            "icon": "./assets/feather/heart.svg",
                            "id": "love",
                            "name": "Love",
                            "disabled": true,
                            "action": function () {
                                app.love(app.mk.nowPlayingItem)
                            }
                        },
                        {
                            "icon": "./assets/feather/unheart.svg",
                            "id": "unlove",
                            "name": "Unlove",
                            "disabled": true,
                            "action": function () {
                                app.unlove(app.mk.nowPlayingItem)
                            }
                        },
                        {
                            "icon": "./assets/feather/thumbs-down.svg",
                            "id": "dislike",
                            "name": "Dislike",
                            "disabled": true,
                            "action": function () {
                                app.dislike(app.mk.nowPlayingItem)
                            }
                        },
                        {
                            "icon": "./assets/feather/x-circle.svg",
                            "id": "undo_dislike",
                            "name": "Undo dislike",
                            "disabled": true,
                            "action": function () {
                                app.unlove(app.mk.nowPlayingItem)
                            }
                        },
                        {
                            "icon": "./assets/feather/radio.svg",
                            "name": "Start Radio",
                            "action": function () {
                                app.mk.setStationQueue({song: item_id}).then(() => {
                                    app.mk.play()
                                    app.selectedMediaItems = []
                                })
                            }
                        },
                    ]
                }
            }
            if (this.contextExt) {
                // if this.context-ext.normal is true append all options to the 'normal' menu which is a kvp of arrays
                if (this.contextExt.normal) {
                    menus.normal.items = menus.normal.items.concat(this.contextExt.normal)
                }
            }

            // isLibrary = await app.inLibrary([this.mk.nowPlayingItem])
            // console.warn(isLibrary)
            // if(isLibrary.length != 0) {
            //     if (isLibrary[0].attributes.inLibrary) {
            //         menus.normal.items.find(x => x.id == "addToLibrary").disabled = true
            //     }
            // }else{
            //     menus.normal.items.find(x => x.id == "addToLibrary").disabled = true
            // }

            let rating = await app.getRating(app.mk.nowPlayingItem)
            if(rating == 0) {
                menus.normal.items.find(x => x.id == 'love').disabled = false
                menus.normal.items.find(x => x.id == 'dislike').disabled = false
            }else if(rating == 1) {
                menus.normal.items.find(x => x.id == 'unlove').disabled = false
            }else if(rating == -1) {
                menus.normal.items.find(x => x.id == 'undo_dislike').disabled = false
            }
            CiderContextMenu.Create(event, menus[useMenu])
        },
        LastFMDeauthorize() {
            ipcRenderer.invoke('setStoreValue', 'lastfm.enabled', false).catch((e) => console.error(e));
            ipcRenderer.invoke('setStoreValue', 'lastfm.auth_token', '').catch((e) => console.error(e));
            app.cfg.lastfm.auth_token = "";
            app.cfg.lastfm.enabled = false;
            const element = document.getElementById('lfmConnect');
            element.innerHTML = 'Connect';
            element.onclick = app.LastFMAuthenticate;
        },
        LastFMAuthenticate() {
            console.log("wag")
            const element = document.getElementById('lfmConnect');
            window.open('https://www.last.fm/api/auth?api_key=174905d201451602407b428a86e8344d&cb=ame://auth/lastfm');
            element.innerText = 'Connecting...';

            /* Just a timeout for the button */
            setTimeout(() => {
                if (element.innerText === 'Connecting...') {
                    element.innerText = 'Connect';
                    console.warn('[LastFM] Attempted connection timed out.');
                }
            }, 20000);

            ipcRenderer.on('LastfmAuthenticated', function (_event, lfmAuthKey) {
                app.cfg.lastfm.auth_token = lfmAuthKey;
                app.cfg.lastfm.enabled = true;
                element.innerHTML = `Disconnect\n<p style="font-size: 8px"><i>(Authed: ${lfmAuthKey})</i></p>`;
                element.onclick = app.LastFMDeauthorize;
            });
        },
        parseSCTagToRG: function (tag) {
            let soundcheck = tag.split(" ")
            let numbers = []
            for (item of soundcheck) {
                numbers.push(parseInt(item, 16))

            }
            numbers.shift()
            let gain = Math.log10((Math.max(numbers[0], numbers[1]) ?? 1000) / 1000.0) * -10
            let peak = Math.max(numbers[6], numbers[7]) / 32768.0
            return {
                gain: gain,
                peak: peak
            }
        }

    }
})

Vue.component('sidebar-library-item', {
    template: '#sidebar-library-item',
    props: {
        name: {
            type: String,
            required: true
        },
        page: {
            type: String,
            required: true
        },
        svgIcon: {
            type: String,
            required: false,
            default: ''
        },
        cdClick: {
            type: Function,
            required: false
        }
    },
    data: function () {
        return {
            app: app,
            svgIconData: ""
        }
    },
    async mounted() {
        if (this.svgIcon) {
            this.svgIconData = await this.app.getSvgIcon(this.svgIcon)
        }
    },
    methods: {}
});

// Key binds
document.addEventListener('keydown', function (e) {
    if (e.keyCode === 70 && e.ctrlKey) {
        app.$refs.searchInput.focus()
        app.$refs.searchInput.select()
    }
});

// Hang Timer
app.hangtimer = setTimeout(() => {
    if (confirm("Cider is not responding. Reload the app?")) {
        window.location.reload()
    }
}, 10000)

// add event listener for when window.location.hash changes
window.addEventListener("hashchange", function () {
    app.appRoute(window.location.hash)
});

document.addEventListener('musickitloaded', function () {
    // MusicKit global is now defined
    function initMusicKit() {
        let parsedJson = JSON.parse(this.responseText)
        MusicKit.configure({
            developerToken: parsedJson.Key,
            app: {
                name: 'Apple Music',
                build: '1978.4.1',
                version: "1.0"
            },
            sourceType: 24,
            suppressErrorDialog: true
        });
        setTimeout(() => {
            app.init()
        }, 1000)
    }

    function fallbackinitMusicKit() {
        const request = new XMLHttpRequest();

        function loadAlternateKey() {
            let parsedJson = JSON.parse(this.responseText)
            MusicKit.configure({
                developerToken: parsedJson.developerToken,
                app: {
                    name: 'Apple Music',
                    build: '1978.4.1',
                    version: "1.0"
                },
                sourceType: 24,
                suppressErrorDialog: true
            });
            setTimeout(() => {
                app.init()
            }, 1000)
        }

        request.addEventListener("load", loadAlternateKey);
        request.open("GET", "https://raw.githubusercontent.com/lujjjh/LitoMusic/main/token.json");
        request.send();
    }

    const request = new XMLHttpRequest();
    request.timeout = 5000;
    request.addEventListener("load", initMusicKit);
    request.onreadystatechange = function (aEvt) {
        if (request.readyState == 4) {
            if (request.status != 200)
                fallbackinitMusicKit()
        }
    };
    request.open("GET", "https://api.cider.sh/");
    request.send();
});

if ('serviceWorker' in navigator) {
    // Use the window load event to keep the page load performant
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js?v=1');
    });
  }

const getBase64FromUrl = async (url) => {
    const data = await fetch(url);
    const blob = await data.blob();
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
            const base64data = reader.result;
            resolve(base64data);
        }
    });
}

function uuidv4() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

function refreshFocus() {
    if (document.hasFocus() == false) {
        app.windowFocus(false)
    } else {
        app.windowFocus(true)
    }
    setTimeout(refreshFocus, 200);
}

app.getHTMLStyle()

refreshFocus();

function xmlToJson(xml) {

    // Create the return object
    let obj = {};

    if (xml.nodeType == 1) { // element
        // do attributes
        if (xml.attributes.length > 0) {
            obj["@attributes"] = {};
            for (var j = 0; j < xml.attributes.length; j++) {
                let attribute = xml.attributes.item(j);
                obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
            }
        }
    } else if (xml.nodeType == 3) { // text
        obj = xml.nodeValue;
    }

    // do children
    if (xml.hasChildNodes()) {
        for (var i = 0; i < xml.childNodes.length; i++) {
            var item = xml.childNodes.item(i);
            var nodeName = item.nodeName;
            if (typeof (obj[nodeName]) == "undefined") {
                obj[nodeName] = xmlToJson(item);
            } else {
                if (typeof (obj[nodeName].push) == "undefined") {
                    var old = obj[nodeName];
                    obj[nodeName] = [];
                    obj[nodeName].push(old);
                }
                obj[nodeName].push(xmlToJson(item));
            }
        }
    }
    console.log(obj);
    return obj;
};

var checkIfScrollIsStatic = setInterval(() => {
    try {
        if (position === document.getElementsByClassName('lyric-body')[0].scrollTop) {
            clearInterval(checkIfScrollIsStatic)
            // do something
        }
        position = document.getElementsByClassName('lyric-body')[0].scrollTop
    } catch (e) {
    }

}, 50);

// WebGPU Console Notification
async function webGPU() {
    try {
        const currentGPU = await navigator.gpu.requestAdapter()
        console.log("WebGPU enabled on", currentGPU.name, "with feature ID", currentGPU.features.size)
    } catch (e) {
        console.log("WebGPU disabled / WebGPU initialization failed")
    }
}

webGPU().then()

let screenWidth = screen.width;
let screenHeight = screen.height;


