(function(){
	
	"use strict";
	
	window.namespace = function (ns, splitter) {
		var o, resp, lim, len, i;
		o = window;
		splitter = (splitter || '.');
		ns = ns.split(splitter);
		len = ns.length;
		lim = len-1;
		for(i=0; i<ns.length; i++) {
			resp = i !== lim ? {} : null;
			o = o[ns[i]] = o[ns[i]] || resp;
		}
		return o;
	};

})();