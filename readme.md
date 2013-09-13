# WordPress Front-end Editor

**Contributors:** avryl  
**Tags:** front-end editor, inline editing  
**Requires at least:** 3.6  
**Tested up to:** 3.6.1  
**Stable tag:** 0.2  
**License:** GPLv2 or later  
**License URI:** http://www.gnu.org/licenses/gpl-2.0.html

## Description

Part of [features as plugins](http://make.wordpress.org/core/features-as-plugins/).

*Should* work on all conventional themes, but I’ve only tried it out with Twenty Eleven, Twelve and Thirteen so far.

### What problem(s) are you trying to solve?

* Posts edited and created through the back-end end up looking very different on the front-end.
* `add_editor_style()` tries to solve this, but it has its limits due to the way it works, it's double work for theme authors and most themes don't even support it.
* Post formats aren't supported by `add_editor_style()` at all.
* It's also impossible at the moment to apply any css rules based on classes outside the content. A small example: the colour of the links and headings inside my post are based on the category of that post. Additional css rules have been added based on the post class, but they don't affect the colour in the back-end editor.
* One of the main reasons the posts appear different is that the surrounding elements on the front-end are taken away from the content.
* The title field isn't styled the way it looks on the front-end.
* So the the current editor isn't really WYSIWYG and the content is taken out of context, causing confusing and frustration to users.

### What proposal solution(s) are you interested in exploring?

The solution I'm interested in exploring is a true WYSIWYG front-end editor that doesn't interfere with any css rules and still has all or most of the functionality of the current back-end editor. The scope of the project would be limited to editing and creating posts (meaning posts and pages, as well as CPTs that support it).

#### Current concepts/mockups

* I've made a mockup which can be found [here](https://vimeo.com/72768945).
* @ubernaut made a mockup about front-end editing and designing in general [here](http://ubernaut.wordpress.com/2013/08/19/combined-frontback-end-ui/).
* @scribu made a great [Front-end Editor plugin](http://wordpress.org/plugins/front-end-editor/) a few years ago.
* Utilising the current customiser could be another approach.

### When and where is your group communicating?

Every Thursday, 20:00 UTC, #wordpress-ui

#### Chatlogs

* [12 September](http://irclogs.wordpress.org/chanlog.php?channel=wordpress-ui&day=2013-09-12&sort=asc#m119703)
* [5 September](http://irclogs.wordpress.org/chanlog.php?channel=wordpress-ui&day=2013-09-05&sort=asc#m117455)
* [29 August](http://irclogs.wordpress.org/chanlog.php?channel=wordpress-ui&day=2013-08-29&sort=asc#m115415)
* [22 August](http://irclogs.wordpress.org/chanlog.php?channel=wordpress-ui&day=2013-08-22&sort=asc#m113119)

### Who has joined your group so far?

We're still looking for more people to join us - developers, UI designers and WordPress users/trainers for testing/feedback. Please leave a comment if you're interested to help!

So far @ubernaut, @melchoyce, @trishasalas, @georgestephanis and myself (@avryl) have shown interest.

### Next steps

* Explore other platforms and see how they implement front-end editing.
* Brainstorm.
* Get feedback to the mockups and plugin and decide on the best approach.

## Installation

Don’t install this on a production website!

## Changelog

### 0.2

* Refresh rewrite rules on activation.

### 0.1

* Initial release.