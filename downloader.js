var id = undefined;

self.addEventListener('message', function(event){
  if(event.data == 'quit'){
    self.postMessage({'log':'quit'});
    self.close();
  }
  else if(event.data.id){
    self.postMessage({'log':'id'});
    id = event.data.id;
  }
  else if(event.data.download){
    self.postMessage({'log':'download'});
    cacheFile(event.data.download);
  }
});

var cacheFile = function(track){
  function saveFile(e){
    var resp = this.response;
    try{
      var fs = self.webkitRequestFileSystemSync(PERSISTENT, 1024*1024*100);
      var file = fs.root.getFile(track.id.toString(), {create: true, exclusive: false});
      var fw = file.createWriter();
      fw.onwriteend = function(e){self.postMessage({'log':'Track cached: ' + track.name})};
      fw.onerror = function(e){self.postMessage({'log':'Track chache failed: ' + e.toString()})};
      var bb = new WebKitBlobBuilder();
      bb.append(resp);
      fw.write(bb.getBlob('audio/mpeg'));
      self.postMessage({'log':{'done':id}});
      self.postMessage({'done':id});
    }
    catch(error){
     self.postMessage({'log':error.message});
     self.postMessage({'done':id});
    }

  }

  var xhr = new XMLHttpRequest();
  self.postMessage({'log':track});
  xhr.open('GET', track.url, true);
  xhr.responseType = 'arraybuffer';
  xhr.onload = saveFile;
  xhr.send();
}
