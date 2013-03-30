---
layout: post
title: "Hello Meow"
description: "This is my first post for my meow."
category: 
tags: []
---
{% include JB/setup %}

# Hello Meow

Ein freundliches Hallo an unsere erste Leserin :-)

Das erste JS-Snippet:

{% highlight javascript %}
var meow = Ember.Object.create({
	name: "Meow Cat"
});
var lion = Ember.Object.create({
	name: "Lion"
});
meow.set("loves", lion);
{% endhighlight %}
