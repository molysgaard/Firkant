Queue = function(num){
  this.num = num;

  var queue = [];
  var numberRunning = 0;

  this.addToQueue = function(track){
    for(i in queue){
      if(track.id == queue[i].id){
        return true;
      }
    }
    queue.push(track);
    if(numberRunning < this.num){
      this.startDownloader();
    }
  }
  this.removeFormQueue = function(track){
    newQueue = [];
    for(i in queue){
      if(track.id != queue[i].id){
        newQueue.push(queue[i]);
      }
    }
    queue = newQueue;
  }
  this.getNext = function(){
    if(queue.length == 0){
      return null;
    }
    return queue.splice(0,1)[0];
  }
  this.startDownloader = function(){
    numberRunning += 1;
    this.downloaderCallback();
  }
  this.downloaderCallback = function(){
    var next = this.getNext();
    if(next){
      this.checkAndCache(next, $.proxy(this.downloaderCallback, this));
    }
    else{
      numberRunning -= 1;
    }
  }
  this.gnr = function(){return numberRunning;}
}

wrappedError = function(cb){
  var callback = cb;
  var eh = function(e){
    errorHandler(e);
    callback();
  }
  return eh;
}

Queue.prototype.dl = function(track, callback){
  function saveFile(e){
    function onInitFs(fs) {
      fs.root.getFile(track.id().toString(), {create: true, exclusive: true}, function(fileEntry) {
        fileEntry.createWriter(function(fileWriter){
          fileWriter.onwriteend = function(e){console.log('Track cached: ' + track.name)};
          fileWriter.onerror = function(e){console.log('Track chache failed: ' + e.toString())};
          var blob = new Blob([resp]);
          //bb.append(resp);
          blob.type = 'audio/mpeg';
          fileWriter.write(blob);
          callback();
        }, wrappedError(callback));
      }, wrappedError(callback));
    }
    var resp = this.response;
    window.webkitRequestFileSystem(window.PERSISTENT, 1024*1024*100, function(fs){onInitFs(fs)}, wrappedError(callback));
  }

  var xhr = new XMLHttpRequest();
  xhr.open('GET', track.url, true);
  xhr.responseType = 'arraybuffer';
  xhr.onload = saveFile;
  xhr.send();
}

Queue.prototype.checkAndCache = function(track, cb){
  var self = this;
  function onInitFs(fs) {
    fs.root.getFile(track.id().toString(), {'create':false}, function(fileEntry) {
      fileEntry.file(function(file) {
         console.log('track already cached: ' + track.name);
         cb();
      }, wrappedError(cb));
    }, function(e){
         console.log('will now cache: ' + track.name);
         self.dl(track, cb);
       });
  }
  window.webkitRequestFileSystem(window.PERSISTENT, 1024*1024*100, onInitFs, wrappedError(cb));
}
