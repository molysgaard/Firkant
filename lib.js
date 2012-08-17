function Artist(lib, id, source){
  // public properties
  this.name = undefined;
  this.cache = false;
  this.source = source;

  // private properties
  var id = id;
  var lib = lib;

  var albums = {};

  // priviledged properties
  this.id = function(){
    return id;
  }
  this.getAlbums = function(){
    var albs = [];
    for(i in albums){
      albs.push(lib.albums[i]);
    }
    albs.sort(function(a,b){return (a.name < b.name) ? -1 : 1});
    return albs;
  }
  this.addAlbum = function(id){
    albums[id] = 1;
  }
  this.toObject = function(){
    return {'name':this.name, 'cache':this.cache, 'id':id, 'albums':albums, 'source':this.source};
  }
}
Artist.prototype.getTracks = function(){
  var albs = this.getAlbums();
  var tracks = [];
  for(i in albs){
    tracks = tracks.concat(albs[i].getTracks());
  }
  return tracks;
}

function Album(lib, id, source){
  // public properties
  this.name = undefined;
  this.disk = undefined;
  this.year = undefined;
  this.artist = undefined;
  this.cache = false;
  this.source = source;

  // private properties
  var lib = lib;
  var id = id;
  var tracks = {};

  // priviledged methods
  this.id = function(){
    return id;
  }
  this.getTracks = function(){
    var t = [];
    for(i in tracks){
      t.push(lib.tracks[i]);
    }
    t.sort(function(a,b){return a.trackNum - b.trackNum});
    return t;
  }
  this.addTrack = function(id){
    tracks[id] = 1;
  }
  this.getArtist = function(){
    return lib.artists[this.artist];
  }
  this.toObject = function(){
    return {'name':this.name, 'disk':this.disk, 'year':this.year, 'artist':this.artist, 'cache':this.cache, 'id':id, 'tracks':tracks, 'source':this.source};
  }
}

function Track(lib, id, source){
  // public properties
  this.name = undefined;
  this.trackNum = undefined;
  this.length = undefined;
  this.year = undefined;
  this.url = undefined;
  this.album = undefined;
  this.cache = false;
  this.source = source;

  // private properties
  var lib = lib;
  var id = id;

  // priviledged methods
  this.id = function(){
    return id;
  }
  this.getAlbum = function(){
    return lib.albums[this.album];
  }
  
  this.getArtist = function(){
    var alb = this.getAlbum();
    return lib.artists[alb.id()];
  }
  this.toObject = function(){
    return {'name':this.name, 'trackNum':this.trackNum, 'length':this.length, 'year':this.year, 'album':this.album, 'cache':this.cache, 'id':id, 'url':this.url, 'source':this.source};
  }
}

function Library(url, user, passwordDigest){
  this.url = url + '/server/xml.server.php';
  this.user = user;
  this.passwordDigest = passwordDigest;

  this.authKey = undefined;

  this.selectedArtist = undefined;
  this.selectedArtistEl = undefined;
  this.selectedAlbum = undefined;
  this.selectedAlbumEl = undefined;

  this.artists = {};
  this.albums = {};
  this.tracks = {};
  this.queue = new Queue(4);
}

Library.prototype.artistFromObject = function(o){
  var a = new Artist(this, o.id, 'cache')
  a.name = o.name;
  a.cache = o.cache;
  a.albums = o.albums;
  return a;
}
Library.prototype.albumFromObject = function(o){
  var a = new Album(this, o.id, 'cache')
  a.name = o.name;
  a.disk = o.disk;
  a.year = o.year;
  a.artist = o.artist;
  a.cache = o.cache;
  a.tracks = o.track;
  return a;
}
Library.prototype.trackFromObject = function(o){
  var t = new Track(this, o.id, 'cache')
  t.name = o.name;
  t.trackNum = o.trackNum;
  t.length = o.length;
  t.year = o.year;
  t.album = o.album;
  t.cache = o.cache;
  t.url = o.url;
  return t;
}

Library.prototype.getArtists = function(){
  var arts = [];
  for(i in this.artists){
    arts.push(this.artists[i]);
  }
  arts.sort(function(a,b){return (a.name < b.name) ? -1 : 1});
  return arts;
}

Library.prototype.addArtist = function(artist){
  var cur = this.artists[artist.id()]
  if(cur){
    cur.name = artist.name;
    cur.source = artist.source;
    for(albumID in artist.albums){
      cur.albums[albumID] = 1;
    }
  }
  else{
    cur = artist;
  }
  this.artists[cur.id()] = cur;
}
Library.prototype.getArtist = function(id){
  return this.artists[id];
}

Library.prototype.addAlbum = function(album){
  var cur = this.albums[album.id()]
  if(cur){
    cur.name = album.name;
    cur.year = album.year;
    cur.disk = album.disk;
    cur.artist = album.artist;
    cur.source = album.source;
    for(trackID in album.tracks){
      cur.tracks[trackID] = 1;
    }

    // check caching
    var art = cur.getArtist();
    if(album.cache || art.cache){
      cur.cache = true;
    }
  }
  else{
    cur = album;
  }
  this.albums[cur.id()] = cur;
  this.artists[cur.artist].addAlbum(cur.id());
}
Library.prototype.getAlbum = function(id){
  var alb = this.albums[id];
  for(key in alb.tracks){
    alb.tracks[key] = this.getTrack(key);
  }
  return alb;
}

Library.prototype.addTrack = function(track){
  var cur = this.tracks[track.id()]
  if(cur){
    cur.name = track.name;
    cur.length = track.length;
    cur.trackNum = track.trackNum;
    cur.album = track.album;
    cur.url = track.url
    cur.source = track.source

    // check caching
    var alb = cur.getAlbum();
    var art = alb.getArtist();
    if(track.cache || alb.cache || art.cache){
      cur.cache = true;
    }
  }
  else{
    cur = track;
    console.log(track.cache);
  }
  this.tracks[cur.id()] = cur;
  this.albums[cur.album].addTrack(cur.id());
}
Library.prototype.getTrack = function(id){
  return this.tracks[id];
}

Library.prototype.authenticate = function(){
  var timestamp = Math.round((new Date())/1000)
  var authKey = SHA256(timestamp.toString() + this.passwordDigest);

  var url = this.url + "?action=handshake&auth=" + authKey + "&timestamp=" + timestamp + "&user=" + this.user + "&version=350001";

  this.loadCache();
  $(window).trigger('changed.library');
  var prom = $.get(url);
  return prom;
}

Library.prototype.authCallback = function(data){
  this.authKey = data.getElementsByTagName('auth')[0].childNodes[0].data;
  this.fetchArtists();
  this.removeOrphans();
  this.refreshCache();
}

Library.prototype.fetchCallback = function(data, parseData, retry){
  var error = data.getElementsByTagName('error')[0];
  if(error && error.getAttribute('code') == '401' && error.childNodes[0].data == 'Session Expired'){
    var prom = this.authenticate();
    prom.done($.proxy(this.authCallback,this), retry);
  }
  else if(error && error.getAttribute('code') == '401' && error.childNodes[0].data == 'Error Invalid Handshake - Invalid Username/Password'){
    window.location = 'options.html';
    alert('wrong username/password');
  }
  else{
      parseData(data);
  }
}

Library.prototype.fetchArtists = function(){
  var url = this.url + "?action=artists&auth=" + this.authKey;
  var prom = $.get(url);
  var parseData = $.proxy(this.fetchArtistsCallback, this);
  var retry = $.proxy(this.fetchArtists, this);
  prom.done($.proxy(function(data){this.fetchCallback(data,parseData,retry)},this));

}
Library.prototype.fetchArtistsCallback = function(data){
  arts = data.getElementsByTagName('artist');
  for (i=0; i<arts.length; i++){
    var a = arts[i];
    var artist = new Artist(this, parseInt(a.getAttribute('id'), 'api'));
    artist.name = a.getElementsByTagName('name')[0].childNodes[0].data;
    this.addArtist(artist);
  }
  $(window).trigger('artistsChanged.library');
}

Library.prototype.fetchArtistAlbums = function(id){
  var url = this.url + "?action=artist_albums&auth=" + this.authKey + "&filter=" + id;
  var prom = $.get(url);
  var parseData = $.proxy(this.fetchArtistAlbumsCallback, this);
  var retry = $.proxy(function(){this.fetchArtistAlbums(id)}, this);
  prom.done($.proxy(function(data){this.fetchCallback(data,parseData,retry)},this));

  return prom;
}
Library.prototype.fetchArtistFull = function(id){
  var url = this.url + "?action=artist_albums&auth=" + this.authKey + "&filter=" + id;
  var get = $.get(url);
  var self = this;
  var yall = get.pipe(function(data){
    var ids = self.fetchArtistAlbumsCallback(data);
    var promises = [];
    for(i in ids){
      promises.push(self.fetchAlbumTracks(ids[i]));
    }
    return $.when.apply(self, promises);
  });
  return yall;
}
Library.prototype.fetchArtistAlbumsCallback = function(data){
  alb = data.getElementsByTagName('album');
  ids = [];
  for (i=0; i<alb.length; i++){
    var a = alb[i];
    var id = parseInt(a.getAttribute('id'));
    ids.push(id);

    var album = new Album(this, id, 'api');
    album.name = a.getElementsByTagName('name')[0].childNodes[0].data;
    album.disk = parseInt(a.getElementsByTagName('disk')[0].childNodes[0].data);
    album.year = parseInt(a.getElementsByTagName('year')[0].childNodes[0].data);
    album.artist = parseInt(a.getElementsByTagName('artist')[0].getAttribute('id'));
    this.addAlbum(album);
  }
  $(window).trigger('albumsChanged.library');
  return ids;
}

Library.prototype.fetchAlbumTracks = function(id){
  var url = this.url + "?action=album_songs&auth=" + this.authKey + "&filter=" + id;

  var prom = $.get(url);
  var parseData = $.proxy(this.fetchAlbumTracksCallback, this);
  var retry = $.proxy(function(){this.fetchAlbumTracks(id)}, this);
  prom.done($.proxy(function(data){this.fetchCallback(data,parseData,retry)},this));
  return prom;
}

Library.prototype.fetchAlbumTracksCallback = function(data){
  song = data.getElementsByTagName('song');
  var ids = [];
  for (i=0; i<song.length; i++){
    var s = song[i];
    var id = parseInt(s.getAttribute('id'));
    ids.push(id);

    var track = new Track(this, id, 'api');
    track.name = s.getElementsByTagName('title')[0].childNodes[0].data;
    track.trackNum = parseInt(s.getElementsByTagName('track')[0].childNodes[0].data);
    track.length = parseInt(s.getElementsByTagName('time')[0].childNodes[0].data);
    track.album = parseInt(s.getElementsByTagName('album')[0].getAttribute('id'));
    track.url = s.getElementsByTagName('url')[0].childNodes[0].data;
    this.addTrack(track);
  }
  $(window).trigger('tracksChanged.library');
  return ids;
}

Library.prototype.isAllCached = function(elem){
  if(elem instanceof Artist){
    for(albumID in elem.albums){
      for(trackID in this.albums[albumID].tracks){
        if(this.tracks[trackID].cache == false){
          return false;
        }
      }
    }
    return true;
  }
  else if(elem instanceof Album){
    for(trackID in elem.tracks){
      if(this.tracks[trackID].cache == false){
        return false;
      }
    }
    return true;
  }
  else if(elem instanceof Track){
    return elem.cache;
  }
}

Library.prototype.allFromCache = function(elem){
  //if(elem.source=='api'){
  //  return false;
  //}

  if(elem instanceof Artist){
    var albs = elem.getAlbums();
    for(i in albs){
      if(! this.allFromCache(albs[i])){
        return false;
      }
    }
    return true;
  }
  else if(elem instanceof Album){
    var trcks = elem.getTracks();
    for(i in trcks){
      if(! this.allFromCache(trcks[i])){
        return false;
      }
    }
    return true;
  }
  else if(elem instanceof Track){
    return elem.source=='cache';
  }
}

Library.prototype.setSelectedArtist = function(event){
  var j = $(event.target);
  if(this.selectedArtistEl){
    this.selectedArtistEl.removeClass('selected');
  }
  j.addClass('selected');
  this.selectedArtistEl = j;
  id = j.data('id');
  this.selectedArtist = this.artists[id];
  if(this.allFromCache(this.artists[id]) && navigator.onLine){
    this.fetchArtistAlbums(id);
  }
  else{
    $(window).trigger('albumsChanged.library');
  }
}
Library.prototype.setSelectedAlbum = function(event){
  var j = $(event.target);
  if(this.selectedAlbumEl){
    this.selectedAlbumEl.removeClass('selected');
  }
  j.addClass('selected');
  this.selectedAlbumEl = j;
  id = j.data('id');
  this.selectedAlbum = this.albums[id];
  if(this.allFromCache(this.albums[id]) && navigator.onLine){
    this.fetchAlbumTracks(id);
  }
  else{
    $(window).trigger('tracksChanged.library');
  }
}
Library.prototype.setCache = function(elem, cache){
  elem.cache = cache;
  if(elem instanceof Artist){
    albs = elem.getAlbums();
    for(i in albs){
      this.setCache(albs[i], cache);
    }
  }
  else if(elem instanceof Album){
    tracks = elem.getTracks();
    for(i in tracks){
      this.setCache(tracks[i], cache);
    }
  }
  else if(elem instanceof Track){
    if(cache){
      //this.cacheFile(elem);
      this.queue.addToQueue(elem);
    }
    else{
      this.queue.removeFormQueue(elem);
      this.deleteFile(elem);
    }
  }
}

Library.prototype.deleteFile = function(track){
  function onInitFs(fs) {
    fs.root.getFile(track.id().toString(), {create: true, exclusive: false}, function(fileEntry) {
      fileEntry.remove(function(e){
        console.log('Track deleted: ' + track.name);
      }, errorHandler);
    }, errorHandler);
  }
  window.webkitRequestFileSystem(window.PERSISTENT, 1024*1024*100, onInitFs, errorHandler);
}
Library.prototype.hasCachedChild = function(elem){
  if(elem instanceof Artist){
    if(elem.cache){
      return true;
    }
    albs = elem.getAlbums();
    for(i in albs){
      if(this.hasCachedChild(albs[i])){
        return true;
      }
    }
  }
  else if(elem instanceof Album){
    if(elem.cache){
      return true;
    }
    tracks = elem.getTracks();
    for(i in tracks){
      if(tracks[i].cache){
        return true;
      }
    }
  }
  else if(elem instanceof Track){
    if(elem.cache){
      return true;
    }
  }
  return false;
}
Library.prototype.saveLib = function(){
  var arts = {};
  for(id in this.artists){
    if(this.hasCachedChild(this.artists[id])){
      arts[id] = this.artists[id].toObject();
    }
  }
  var albs = {};
  for(id in this.albums){
    if(this.hasCachedChild(this.albums[id])){
      albs[id] = this.albums[id].toObject();
    }
  }
  var tracks = {};
  for(id in this.tracks){
    if(this.hasCachedChild(this.tracks[id])){
      tracks[id] = this.tracks[id].toObject();
    }
  }
  var lib = {'artists':arts, 'albums':albs, 'tracks':tracks}
  window.localStorage.setItem('lib',JSON.stringify(lib));
}
Library.prototype.loadCache = function(){
  var lib = JSON.parse(window.localStorage.getItem('lib'));
  console.log(lib);
  if(lib){
    for(i in lib.artists){
      for(j in lib.artists[i].albums){
        if(! lib.albums[j]){
          delete lib.artists[i].albums[j];
        }
      }
    }
    for(i in lib.albums){
      for(j in lib.albums[i].tracks){
        if(! lib.tracks[j]){
          delete lib.albums[i].tracks[j];
        }
      }
    }
    for(i in lib.artists){
      var art = this.artistFromObject(lib.artists[i]);
      art.source = 'cache';
      this.addArtist(art);
    }
    for(i in lib.albums){
      var alb = this.albumFromObject(lib.albums[i]);
      alb.source = 'cache';
      this.addAlbum(alb);
    }
    for(i in lib.tracks){
      var trck = this.trackFromObject(lib.tracks[i]);
      trck.source = 'cache';
      this.addTrack(trck);
    }
  }
}
Library.prototype.flushCache = function(){
  console.log('flushing cache');
  function onInitFs(fs) {
    reader = fs.root.createReader()
    reader.readEntries(function(entries) {
      for(i in entries){
        if(entries[i].removeRecursively){
          entries[i].removeRecursively(function(e){
            console.log('deleted: ' + entries[i].name);
          }, errorHandler);
        }
        else{
          entries[i].remove(function(e){
            console.log('deleted: ' + entries[i].name);
          }, errorHandler);
        }
      }
    }, errorHandler);
  }
  window.webkitRequestFileSystem(window.PERSISTENT, 1024*1024*100, onInitFs, errorHandler);
  window.localStorage.removeItem('lib');
}

Library.prototype.removeOrphans = function(){
  var self = this;
  console.log('removing orphaned files');
  function onInitFs(fs, self) {
    reader = fs.root.createReader()
    reader.readEntries(function(entries) {
      for(i in entries){
        var id = parseInt(entries[i].name);
        if(! self.tracks[id] || ! self.tracks[id].cache){
          console.log('deleted orphaned file: ' + entries[i].name);
          console.log(self.tracks[id]);
          //entries[i].remove(function(e){}, errorHandler);
        }
      }
    }, errorHandler);
  }
  window.webkitRequestFileSystem(window.PERSISTENT, 1024*1024*100, function(fs){onInitFs(fs,self)}, errorHandler);
}

Library.prototype.refreshCache = function(){
  for(i in this.tracks){
    var t = this.tracks[i];
    if(t.cache){
      this.queue.addToQueue(t);
    }
  }
}
