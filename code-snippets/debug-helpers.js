// LINKS
// http://emberjs.com/guides/understanding-ember/debugging/
// https://github.com/tildeio/ember-extension.git


Ember.Array.reopen({
	logContents : function(){
		this.forEach(function(item, index){
			App.LOG.warn(index + ": " + item.toString());
		});
	}
});

$.fn.emberView = function(type){
  var element = this,
  emberView = Ember.View.views[this.attr('id')];
 
  type = type || Ember.View;
 
  if (emberView && emberView instanceof type) {
    return emberView;
  }
 
  return this.parent().closest('.ember-view').emberView(type);  
};
 
$.fn.emberController = function(){
  return this.emberView().get('controller');
};
 
$.fn.emberContent = function(){
  return this.emberView().get('content');
};
$.fn.emberContext = function(){
  return this.emberView().get('context');
};

function ev(emberId){
	return $("#ember" + emberId).emberView();
}
function ec(emberId){
	return ev(emberId).get("controller");
}


Ember.RSVP.configure('onerror', function(e) {
  App.LOG.warn(e.message); 
  App.LOG.warn(e.stack);
});