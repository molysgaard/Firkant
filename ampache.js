Ampache = function(url, user, password){
  var auth = JSON.parse(window.localStorage.getItem('auth'));
  if(auth && auth.url && auth.user && auth.passwordDigest){
    this.lib = new Library(auth.url, auth.user, auth.passwordDigest);
  }
  else{
    window.location = 'options.html';
  }
  this.curObjectURL = undefined;
  this.curTrack = undefined;
}

Ampache.prototype.draw = function(){
  this.drawArtists();
  this.drawAlbums();
  this.drawTracks();
}

Ampache.prototype.drawArtists = function(){
  var filter = $('#artistFilter').val().toLowerCase();
  $('#artists').empty();
  l = this.lib.getArtists();
  for(i in l){
    if(l[i].name.toLowerCase().indexOf(filter) != -1){
      var el = $('<li>'+l[i].name+'</li>');
      el.data('id',l[i].id());
      if(l[i].cache){
        el.addClass('cached');
      }
      $('#artists').append(el);
    }
  }
}

Ampache.prototype.drawAlbums = function() {
  if(this.lib.selectedArtist){
    $('#albums').empty();
    $('#tracks').empty();
    var curArtist = this.lib.selectedArtist;
    var l = curArtist.getAlbums();
    for(i in l){
      var year = l[i].year;
      if(! isFinite(year)){
        year = '';
      }
      var el = $('<li>'+l[i].name+'<span class="year">'+year+'</span></li>');
      el.data('id',l[i].id());
      if(l[i].cache){
        el.addClass('cached');
      }
      $('#albums').append(el);
    }
  }
}

Ampache.prototype.drawTracks = function() {
  if(this.lib.selectedAlbum){
    $('#tracks').empty();
    var curAlbum = this.lib.selectedAlbum;
    l = curAlbum.getTracks();
    for(i in l){
      var len = l[i].length;
      var min = Math.floor(len/60); 
      var sec = len - min*60;
      var el = $('<li>'+l[i].name+'<span class="year">'+min+':'+sec+'</span></li>');
      el.data('id',l[i].id());
      if(l[i].cache){
        el.addClass('cached');
      }
      $('#tracks').append(el);
    }
  }
}

Ampache.prototype.queueArtist = function(event){
  var id = $(event.target).data('id');

  var self = this;
  var callback = function(id){
    var artist = self.lib.getArtist(id);
    self.queueTracks(artist.getTracks());
    if($('#player')[0].paused){
      self.next();
    }
  }

  var prom = this.lib.fetchArtistFull(id);
  prom.done(function(){callback(id)});
}

Ampache.prototype.queueAlbum = function(event){
  id = $(event.target).data('id');
  var alb = this.lib.getAlbum(id);
  this.queueTracks(alb.getTracks());

  if($('#player')[0].paused){
    this.next();
  }
}

Ampache.prototype.queueTrack = function(event){
  var id = $(event.target).data('id');
  var track = this.lib.getTrack(id);
  this.queueTracks([track]);

  if($('#player')[0].paused){
    this.next();
  }
}

Ampache.prototype.queueTracks = function(tracks){
  for(i in tracks){
    var track = tracks[i];
    var alb = track.getAlbum();
    var art = alb.getArtist();
    var li = $('<li>'+track.name+' - '+alb.name+' - '+art.name+'</li>').addClass('ui-state-default');
    var toggleSelect = function(event){
      var el = $(event.target);
      if(el.hasClass('selected')){
        el.removeClass('selected');
      }
      else{
        el.addClass('selected');
      }
    }
    li.click(toggleSelect);
    li.data('track', track);
    $('#queue').append(li);
  }
}

Ampache.prototype.globalKeys = function(event){
  // RIGHT ARROW plays next track
  if(event.keyCode == 39){
    this.next();
  }
  //SPACE key toggle play
  if(event.keyCode == 32){
    this.togglePlay();
  }

  // DELETE key deletes part or the whole queue
  if(event.keyCode == 46){
    if(event.shiftKey){
      var lis = $('#queue').children().remove();
    }
    else{
    var lis = $('#queue').children('.selected').remove();
    }
  }
}

Ampache.prototype.next = function(event){
  var track = $($('#queue>li')[0]).data('track')
  this.curTrack = track;
  this.getCached(track);
  this.updateController(track);
  $($('#queue>li')[0]).remove()
}
Ampache.prototype.pause = function(event){
  $('#player').pause();
}
Ampache.prototype.togglePlay = function(event){
  if($('#player')[0].paused){
    $('#player')[0].play();
  }
  else{
    $('#player')[0].pause();
  }
}

Ampache.prototype.getCached = function(track){
  var self = this;
  function onInitFs(fs) {
    fs.root.getFile(track.id().toString(), {'create':false}, function(fileEntry) {

      // Get a File object representing the file,
      // then use FileReader to read its contents.
      fileEntry.file(function(file) {
         console.log('cached');
         if(this.curObjectURL){
           window.webkitURL.revokeObjectURL(this.curObjectURL);
         }
         this.curObjectURL = window.webkitURL.createObjectURL(file);
         $('#player').attr('src', this.curObjectURL);
         var play = document.getElementById('player')
         play.play();
      }, errorHandler);
    }, function(e){
         console.log('not cached');
         if(track.cache){
           self.lib.queue.addToQueue(track);
         }
         errorHandler(e);
         $('#player').attr('src', track.url);
         var play = document.getElementById('player')
         play.play();
       });
  }
  window.webkitRequestFileSystem(window.PERSISTENT, 1024*1024*100, onInitFs, errorHandler);
}

Ampache.prototype.updateController = function(track){
  var alb = track.getAlbum();
  var art = alb.getArtist();
  $('#curPlayTitle').text(track.name);
  var min = Math.floor(track.length/60); 
  var sec = track.length - min*60;
  $('#curPlayLength').text(min + ':' + sec);
  $('#curPlayAlbum').text(alb.name);
  $('#curPlayYear').text(alb.year);
  $('#curPlayArtist').text(art.name);
}

Ampache.prototype.showContextMenu = function(event){
  return false;
}

Ampache.prototype.toggleCacheArtist = function(event){
  if(event.which==3){
    art = this.lib.getArtist($(event.target).data('id'));
    var prom = this.lib.fetchArtistFull(art.id());
    var callback = function(){
      this.lib.setCache(art, !art.cache)
      $(window).trigger('changed.library');
      this.lib.saveLib();
    }
    prom.done($.proxy(callback,this));
  }
}
Ampache.prototype.toggleCacheAlbum = function(event){
  if(event.which==3){
    alb = this.lib.getAlbum($(event.target).data('id'));
    var prom = this.lib.fetchAlbumTracks(alb.id());
    var callback = function(){
      this.lib.setCache(alb, !alb.cache)
      $(window).trigger('changed.library');
      this.lib.saveLib();
    }
    prom.done($.proxy(callback, this));
  }
}
Ampache.prototype.toggleCacheTrack = function(event){
  if(event.which==3){
    track = this.lib.getTrack($(event.target).data('id'));
    this.lib.setCache(track, !track.cache)
    $(window).trigger('changed.library');
    this.lib.saveLib();
  }
}


Ampache.prototype.bind = function(){
  $('#artists').click($.proxy(this.lib.setSelectedArtist, this.lib));
  $('#albums').click($.proxy(this.lib.setSelectedAlbum, this.lib));

  $('#artists').on('contextmenu', $.proxy(this.showContextMenu, this));
  $('#albums').on('contextmenu', $.proxy(this.showContextMenu, this));
  $('#tracks').on('contextmenu', $.proxy(this.showContextMenu, this));

  $('#artists').on('mousedown', $.proxy(this.toggleCacheArtist, this));
  $('#albums').on('mousedown', $.proxy(this.toggleCacheAlbum, this));
  $('#tracks').on('mousedown', $.proxy(this.toggleCacheTrack, this));

  $('#artists').on('dblclick', $.proxy(this.queueArtist, this));
  $('#albums').on('dblclick', $.proxy(this.queueAlbum, this));
  $('#tracks').on('dblclick', $.proxy(this.queueTrack, this));

  $('#next').on('click', $.proxy(this.next, this));
  $('#playPause').on('click', $.proxy(this.togglePlay, this));

  $('#player').on('ended', $.proxy(this.next, this));
  $('#player').on('play', function(){$('#playPauseImg').attr('src','icons/pause.svg')});
  $('#player').on('pause',function(){$('#playPauseImg').attr('src','icons/play.svg')});

  $('#artistFilter').on('change', function(e){$(window).trigger('artistsChanged.library')});

  $(window).bind('changed.library', $.proxy(this.draw, this));
  $(window).bind('artistsChanged.library', $.proxy(this.drawArtists, this));
  $(window).bind('albumsChanged.library', $.proxy(this.drawAlbums, this));
  $(window).bind('tracksChanged.library', $.proxy(this.drawTracks, this));
  $(window).bind('keydown', $.proxy(this.globalKeys, this));

  $('#tracker').bind('slidestop', $.proxy(this.setProgress, this));
  $('#volume').bind('slide', $.proxy(this.setVolume, this));

  setInterval($.proxy(this.updateProgress,this),1000);
}

Ampache.prototype.setProgress = function(){
  var val = $('#tracker').slider('option', 'value');
  $('#player')[0].currentTime = val;
}

Ampache.prototype.setVolume = function(){
  var val = $('#volume').slider('option', 'value');
  $('#player')[0].volume = val;
}

Ampache.prototype.updateProgress = function(){
  if(this.curTrack && !$('#player')[0].paused){
    var cur = $('#player')[0].currentTime;
    $('#tracker').slider('option', 'value', cur);
    $('#tracker').slider('option', 'max', this.curTrack.length);
  }
}

Ampache.prototype.uiSetup = function(){
  this.updateCss();
  $('#queue').sortable({placeholder: "ui-state-highlight"});
  $('#queue').disableSelection();
  $('#tracker').slider();
  $('#volume').slider({orientation:'vertical',value:1,min:0,max:1,step:0.002});
}

Ampache.prototype.updateCss = function(){
  var templateCss = function(data){
    var style = JSON.parse(window.localStorage.getItem('style'));
    if(! style){
      style = {'fg':'#724c2d', 'bg':'#bce1dd', 'fgSel':'#f8bb84', 'bgSel':'#6e8f8c'};
      window.localStorage.setItem('style', JSON.stringify(style));
    }
    var css = template(data, style);
    $('#mainStyle').text(css);
  }
  var prom = $.get('main.css')
  prom.done(templateCss);
}

var template = function(string, mapping){
  var patt = /{{ (\w+) }}/g;
  string = string.replace(patt, function(a, id){
    if(mapping[id]){
      return mapping[id].toString();
    }
    else{
      return id;
    }
  });
  return string;
}
