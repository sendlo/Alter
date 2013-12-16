var errorCallback = function(e) {
    console.log('Camera access denied.', e);
};

var currentFilterSet = [];

var activeFilterSet = $(".filterSet");
var activeFilter = $(".activeFilter");
var oldFilter = null;


validFilters = {};
validFilters["Swirl"] = {
	name:"Swirl",
	api: "swirl",
	p: [
		{"name": "CenterX", val:0, type:1},
		{"name": "CenterY", val:0, type:1},
		{"name": "Radius", val:0, type:1},
		{"name": "Angle", val:0, type:1}
	]
};
validFilters["Ink"] = {
	name:"Ink",
	api: "ink",
	p: [
		{"name": "Strength", val:0, type:1}
	]
}
validFilters["Brightness / Contrast"] = {
	name:"Brightness / Contrast",
	api: "brightnessContrast",
	p: [
		{"name": "Brightness", val:0, type:1},
		{"name": "Contrast", val:0, type:1}
	]
}
validFilters["Hue / Saturation"] = {
	name:"Hue / Saturation",
	api: "hueSaturation",
	p: [
		{"name": "Hue", val:0, type:1},
		{"name": "Saturation", val:0, type:1}
	]
}
validFilters["Zoom Blur"] = {
	name:"Zoom Blur",
	api: "zoomBlur",
	p: [
		{"name": "CenterX", val:0, type:1},
		{"name": "CenterY", val:0, type:1},
		{"name": "Strength", val:0, type:1}
	]
}



var storedFilterSets = [];

// attach events
$(".filterSetList").on("click", ".filterPic", function(){
	var filterSet = buildFilterSet(mydata($(this),"fs"));
	updateActiveFilterSet(filterSet);
	updateAppliedFilter();
});

$(".filterSet").on("click", ".activeFilterLink", function(){
	updateActiveFilter(mydata($(this), "name"), mydata($(this),"p"));
});

$(".activeFilter").on("change", "input", function(){
	saveFilterParamVal($(this));
});

function saveFilterParamVal(fld) {
	var set = fld.data("set") || 0,
		num = fld.data("num") || 0,
		link = $(".activeFilterLink[data-set='" + set + "']").get(0),
		val = fld.val();

	val = validateFilterParamValue(set, num, val);
	updateActiveFilterSetData(link, "", val, num);
	updateAppliedFilter();
}

function validateFilterParamValue(set, num, val) {
	var filter = validFilters[set];
	if(!filter || !filter.p[num]) {
		return 0;
	}
	if(filter.p[num].type === 1) {
		val = parseFloat(val);
		if(isNaN(val)) {
			val = 0
		}
	}
	return val;
}

function loadFilters(filterSetList){
	var i, 
		filterPic,
		max = storedFilterSets.length;
	filterSetList.html("");

	for(i=0;i<8;i++) {
		var rand = Math.floor((Math.random()*max)+1) - 1;
		var set = storedFilterSets[rand];
		filterPic = $('<div class="filterPic"></div>');
		mydata(filterPic, "fs", set);
		filterSetList.append(filterPic);
	}
}

function buildFilterSet(filterSet) {
	if(!filterSet) {
		filterSet=[];
	} else if(typeof filterSet === "string") {
		try{
			filterSet = JSON.parse(filterSet).set;
		}catch(e){
			console.log("Error parsing filteset: " + filterSet);
			filterSet=[];
		}
	} else {
		filterSet = filterSet.set;
	}
	return filterSet;
}

function buildFilter(name, params) {
	var filter = validFilters[name],
		paramLength;	
	if(filter){
		for(var i=0,j=params.length,k=filter.p.length;i<j && i<k;i++){
			filter.p[i].val = params[i];
		}
	}
	return filter;
}

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
		c = fx.canvas(),
		w = 600, 
		h = 420;
	v.parentNode.appendChild(c);
	v.addEventListener('canplay', function(e) {
	   if (!isStreaming) {
		  // videoWidth isn't always set correctly in all browsers
		  if (v.videoWidth > 0) h = v.videoHeight / (v.videoWidth / w);
		  c.setAttribute('width', w);
		  c.setAttribute('height', h);
		  isStreaming = true;
	   }
	}, false);
	v.addEventListener('play', function() {
		var texture = c.texture(v);

	   // Every 33 milliseconds copy the video image to the canvas
	   setInterval(function() {
		  if (v.paused || v.ended) return;
	        texture.loadContentsOf(v);
			if(currentFilterSet !== oldFilter) {
				console.log("FilterSet change:");
				console.log(currentFilterSet);
				oldFilter = currentFilterSet;
			}
	       	applyFilterSet(c.draw(texture), currentFilterSet).update();
	   }, 33);

		setTimeout(function(){
			$(".filterPic").each(function(){
				try {
					loadSmallCanvas($(this), v);
				}catch(e) {
					console.log("Error loading small canvas: " + e);
				}
			});			
		}, 100);

	}, false);	
	v.src = url ? url.createObjectURL(stream) : stream;
	v.play();
}

function loadSmallCanvas(box, vid) {
	var c = fx.canvas();
	var texture = c.texture(v);
	texture.loadContentsOf(v);
	var filterSet = buildFilterSet(mydata(box,"fs"));
	for(var i=0,j=filterSet.length;i<j;i++) {
		filterSet[i].api = getApiName(filterSet[i].name);
	}
	applyFilterSet(c.draw(texture), filterSet).update();

	var img = new Image();
	console.log(box.width());
	console.log(box.height());
	img.setAttribute("width", box.width());
	img.setAttribute("height", box.height());
	img.src = c.toDataURL('image/png');
	box.append(img);
}

function applyFilterSet(c, filterSet) {
	for(var i=0,j=filterSet.length;i<j;i++){
		c = applyFilter(c, filterSet[i]);
	}
	return c;	
}

function applyFilter(c, filter) {
	if(typeof c[filter.api] === 'function') {
		c[filter.api].apply(c, filter.p);
	}
	return c;
}

function updateActiveFilterSet(fs) {
	activeFilterSet.html("");
	for(var i=0,j=fs.length;i<j;i++){
		var link = $('<a href="javascript:;" class="activeFilterLink" data-set="'+fs[i].name+'">'+fs[i].name+'</a>');
		updateActiveFilterSetData(link, fs[i].name, fs[i].p);
		activeFilterSet.append(link);
		if(i===0) {
			updateActiveFilter(fs[0].name, fs[0].p);
		}
	}
}

function updateActiveFilterSetData(link, name, data, number) {
	if(typeof number === "undefined") {
		mydata(link, "name", name);
		mydata(link, "p", data);
	} else {
		var oldData = mydata(link, "p");
		oldData[number] = data;
		mydata(link, "p", oldData);
	}
}

function updateActiveFilter(name, params) {
	var filter = buildFilter(name, params);
	var htmlOut = "";
	if(filter) {
		htmlOut += "<h4>" + name + "</h4>";
		htmlOut += "<table class='filterparams'>"
		for(var i=0,j=params.length;i<j;i++){
			htmlOut += buildParamControl(name, i, params[i]);
		}
		htmlOut += "</table>";
	} else {
		htmlOut = "No valid filter selected.";
	}
	activeFilter.html(htmlOut);
}

function buildParamControl(name, paramNum, paramValue) {
	var outHtml = "<tr><td class='nm'>" + getFilterParamName(name, paramNum) + "</td><td><input type='text' value='" + paramValue + "' data-num='" + paramNum + "' data-set='" + name + "'/></td></tr>";
	return outHtml;
}

function getFilterParamName(name, num) {
	var filter = validFilters[name] || {p:[]};
	if(filter.p[num]) {
		return filter.p[num].name;
	}
	return "Invalid filter param";
}

function updateAppliedFilter() {
	currentFilterSet = [];
	$('.activeFilterLink', activeFilterSet).each(function(index){
		var name = mydata(this, "name");
		currentFilterSet.push({name: name, p: mydata(this,"p"), api: getApiName(name)});
	});
}

function getApiName(name) {
	var filter = validFilters[name];
	if(!filter) {
		return "undefined";
	}
	return filter.api;
}

function mydata(obj, name, val){
	obj = $(obj);
	if(val) {
		if(typeof val === "string") {
			obj.data(name, val);
		} else {
			obj.data(name, JSON.stringify(val));
		}
	} else {
		var out = obj.data(name);
		try{
			out = JSON.parse(obj.data(name));
		}catch(e){
			out = obj.data(name);
		}
		if(name === "p" && typeof out !== "object"){
			out = [out];
		}
		return out;
	}	
}

storedFilterSets.push({set:[
	{name:"Swirl", p:[500,150,200,-1]},
	{name:"Ink", p:[0.1]}
]});

storedFilterSets.push({set:[
	{name:"Swirl", p:[300,210,100,-2]},
	{name:"Ink", p:[0.5]}
]});

storedFilterSets.push({set:[
	{name:"Brightness / Contrast", p:[-0.3,0.2]},
	{name:"Ink", p:[0.9]}
]});

storedFilterSets.push({set:[
	{name:"Hue / Saturation", p:[0.3,0.3]},
	{name:"Brightness / Contrast", p:[-0.2,0.2]}
]});

storedFilterSets.push({set:[
	{name:"Hue / Saturation", p:[0.3,0.3]},
	{name:"Ink", p:[0.2]}
]});

storedFilterSets.push({set:[
	{name:"Hue / Saturation", p:[0.3,0.3]},
	{name:"Ink", p:[0.2]}
]});

storedFilterSets.push({set:[
	{name:"Zoom Blur", p:[200,200, 0.4]},
	{name:"Brightness / Contrast", p:[0.2, 0.6]}
]});

storedFilterSets.push({set:[
	{name:"Hue / Saturation", p:[0.8, 0.8]},
	{name:"Brightness / Contrast", p:[0.6, -0.3]}
]});

storedFilterSets.push({set:[
	{name:"Hue / Saturation", p:[0.8, 0.8]},
	{name:"Swirl", p:[400,200,150,-3]}
]});


loadFilters($(".publicFilters"));
loadFilters($(".privateFilters"));
requestVideo();	

