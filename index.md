---
layout: page
title: Welcome to my Blog :-)
tagline: Here i am just messing around a little bit.
---
{% include JB/setup %}

## What is this Blog about?
I am a Software Developer from Berlin. My main background is *Java*. But lately i have been learning Javascript, in particular developing client side applications with *EmberJS*. Additionally i am learning *Scala*. My posts will be most likely about Scala and EmberJS. Every time i encounter an interesting topic, i will cover it here. This is mainly an exercise for me, so that i am sure i have understand the presented problems properly. Maybe someone else finds it useful too :-)

<a href="https://twitter.com/mav1lein" class="twitter-follow-button" data-show-count="false" data-lang="en">Follow @twitterapi</a>
<script>!function(d,s,id){var js,fjs=d.getElementsByTagName(s)[0];if(!d.getElementById(id)){js=d.createElement(s);js.id=id;js.src="//platform.twitter.com/widgets.js";fjs.parentNode.insertBefore(js,fjs);}}(document,"script","twitter-wjs");</script>

##### Those are all available Blog posts:
<ul class="posts">
  {% for post in site.posts %}
    {% unless post.draft %}
      <li><span>{{ post.date | date_to_string }}</span> &raquo; <a href="{{ BASE_PATH }}{{ post.url }}">{{ post.title }}</a> <!--({{ post.content | number_of_words }} words)--></li>
    {% endunless %}
  {% endfor %}
</ul>

{% comment %}
Read [Jekyll Quick Start](http://jekyllbootstrap.com/usage/jekyll-quick-start.html)

Complete usage and documentation available at: [Jekyll Bootstrap](http://jekyllbootstrap.com)

## Update Author Attributes

In `_config.yml` remember to specify your own data:
    
    title : My Blog =)
    
    author :
      name : Marcus Böhm
      email : wif.mboehm@gmx.de
      github : username
      twitter : mav1lein

The theme should reference these variables whenever needed.
    
## Sample Posts

This blog contains sample posts which help stage pages and blog data.
When you don't need the samples anymore just delete the `_posts/core-samples` folder.

    $ rm -rf _posts/core-samples

Here's a sample "posts list".

<ul class="posts">
  {% for post in site.posts %}
    <li><span>{{ post.date | date_to_string }}</span> &raquo; <a href="{{ BASE_PATH }}{{ post.url }}">{{ post.title }}</a></li>
  {% endfor %}
</ul>

## To-Do

This theme is still unfinished. If you'd like to be added as a contributor, [please fork](http://github.com/plusjade/jekyll-bootstrap)!
We need to clean up the themes, make theme usage guides with theme-specific markup examples.

{% endcomment %}

