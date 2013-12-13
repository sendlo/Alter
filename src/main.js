var errorCallback = function(e) {
    console.log('Camera access denied.', e);
};

function requestVideo(){

	navigator.getUserMedia  = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

	var video = document.querySelector('video');

	if (navigator.getUserMedia) {
		navigator.getUserMedia(
			{audio: false, video: true}, 
			function(stream) {
				playVideo(stream);
			}, errorCallback);
	} else {
		alert('getUserMedia() is not supported in your browser');
	}
}

function playVideo(stream) {


	var isStreaming = false,
		url = window.URL || window.webkitURL,
		v = document.getElementById('v'),
		c = document.getElementById('c'),
//		grey = document.getElementById('grey');
		con = c.getContext('2d');
		w = 600, 
		h = 420;
//		greyscale = false;

	v.addEventListener('canplay', function(e) {
	   if (!isStreaming) {
		  // videoWidth isn't always set correctly in all browsers
		  if (v.videoWidth > 0) h = v.videoHeight / (v.videoWidth / w);
		  c.setAttribute('width', w);
		  c.setAttribute('height', h);
		  // Reverse the canvas image
		  con.translate(w, 0);
		  con.scale(-1, 1);
		  isStreaming = true;
	   }
	}, false);

	v.addEventListener('play', function() {
	   // Every 33 milliseconds copy the video image to the canvas
	   setInterval(function() {
		  if (v.paused || v.ended) return;
		  con.fillRect(0, 0, w, h);
		  con.drawImage(v, 0, 0, w, h);
//		  if (greyscale) goingGrey();
	   }, 33);
	}, false);	

	
	v.src = url ? url.createObjectURL(stream) : stream;
	v.play();

}


requestVideo();	


