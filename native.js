/* Ponte nativa do Passada: só age dentro do app Android (Capacitor).
   No navegador comum não faz nada e o site continua funcionando como antes. */
(function(){
  var C=window.Capacitor;
  if(!C||!C.isNativePlatform||!C.isNativePlatform())return;
  var P=C.Plugins||{};
  function pl(n){return P[n]||null}

  /* ---- Voz (texto para fala nativo, em português) ---- */
  var TTS=pl('TextToSpeech');
  if(TTS){
    function Utt(t){this.text=t;this.lang='pt-BR';this.rate=1;this.pitch=1;this.voice=null;this.onstart=null;this.onend=null;this.onerror=null}
    var ss={speaking:false,pending:false,paused:false,
      getVoices:function(){return[]},addEventListener:function(){},removeEventListener:function(){},
      cancel:function(){try{TTS.stop()}catch(e){}ss.speaking=false},
      pause:function(){},resume:function(){},
      speak:function(u){
        ss.speaking=true;
        try{u.onstart&&u.onstart()}catch(e){}
        TTS.speak({text:u.text,lang:u.lang||'pt-BR',rate:Math.max(0.5,Math.min(2,u.rate||1)),pitch:u.pitch||1,volume:1,category:'playback',queueStrategy:0})
          .then(function(){ss.speaking=false;try{u.onend&&u.onend()}catch(e){}})
          .catch(function(err){ss.speaking=false;try{u.onerror&&u.onerror({error:String(err&&err.message||err)})}catch(e){}});
      }};
    try{Object.defineProperty(window,'speechSynthesis',{value:ss,configurable:true})}catch(e){window.speechSynthesis=ss}
    window.SpeechSynthesisUtterance=Utt;
  }

  /* ---- Tela acesa durante a corrida ---- */
  var KA=pl('KeepAwake');
  if(KA){
    try{
      Object.defineProperty(navigator,'wakeLock',{configurable:true,value:{request:function(){
        try{KA.keepAwake()}catch(e){}
        return Promise.resolve({release:function(){try{KA.allowSleep()}catch(e){}return Promise.resolve()}});
      }}});
    }catch(e){}
  }

  /* ---- Vibração ---- */
  var H=pl('Haptics');
  if(H){
    navigator.vibrate=function(p){
      var d=Array.isArray(p)?p.reduce(function(a,b,i){return i%2===0?a+b:a},0):(p||100);
      try{H.vibrate({duration:Math.max(30,Math.min(1000,d))})}catch(e){}
      return true;
    };
  }

  /* ---- Compartilhar e salvar arquivos ---- */
  var FS=pl('Filesystem'),SH=pl('Share');
  function toB64(blob){return new Promise(function(ok,no){var r=new FileReader();r.onload=function(){ok(String(r.result).split(',')[1]||'')};r.onerror=no;r.readAsDataURL(blob)})}
  function shareBlob(blob,name,title){
    if(!FS||!SH)return Promise.reject(new Error('sem plugins'));
    return toB64(blob).then(function(b64){
      return FS.writeFile({path:name,data:b64,directory:'CACHE'});
    }).then(function(r){
      return SH.share({title:title||'Passada',files:[r.uri],dialogTitle:'Compartilhar'});
    });
  }
  if(FS&&SH){
    navigator.canShare=function(d){return !!(d&&d.files&&d.files.length)};
    navigator.share=function(d){
      var f=d&&d.files&&d.files[0];
      if(f)return shareBlob(f,f.name,d.title);
      return SH.share({title:d&&d.title,text:d&&d.text,url:d&&d.url});
    };
    document.addEventListener('click',function(e){
      var a=e.target&&e.target.closest&&e.target.closest('a[download]');
      if(!a||!/^blob:/.test(a.href))return;
      e.preventDefault();e.stopPropagation();
      fetch(a.href).then(function(r){return r.blob()}).then(function(b){return shareBlob(b,a.getAttribute('download')||'passada',a.getAttribute('download'))}).catch(function(){});
    },true);
  }
})();
