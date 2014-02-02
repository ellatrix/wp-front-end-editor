=== WordPress Front-end Editor ===

Contributors: avryl, wordpressdotorg, Joen, shaunandrews, kraftbj
Tags: front-end editor, inline editing
Requires at least: 3.8
Tested up to: 3.8.1
Stable tag: 0.7.10.1
License: GPLv2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.html

== Description ==

Warning: this plugin is very experimental and not safe to use outside a test environment.

If you found a bug or if you have ideas, add them to [the plugins Trac](https://plugins.trac.wordpress.org/plugin/wp-front-end-editor). We’ll also keep a list of tasks there.

**Weekly IRC Chat:** Tuesdays, 17:00 UTC, #wordpress-ui

[Features as Plugins Tracking](http://make.wordpress.org/core/features-as-plugins/)  
[Make WordPress UI Posts](http://make.wordpress.org/ui/tag/front-end-editor/)  
[GitHub Mirror](https://github.com/avryl/wp-front-end-editor)  
[Trac](https://plugins.trac.wordpress.org/plugin/wp-front-end-editor)

We're still looking for more people to join us - developers, UI designers and users/testers for feedback. Please get in touch on IRC or leave a comment on one of the [Make WordPress UI](http://make.wordpress.org/ui/tag/front-end-editor/) blog posts.

== Installation ==

This is just an experiment!

== Changelog ==

= 0.7.10.1 =

* Fix onbeforeunload.

= 0.7.10 =

* Add TinyMCE tooltips.
* Add TinyMCE paste as text button.
* Fix title placeholder
* Load TinyMCE toolbar on init.

= 0.7.9.2 =

* Fix meta modal in Chrome and Firefox.

= 0.7.9 =

* Update to TinyMCE 4.0.15.
* Move all meta boxes under each other with scroll navigation.
* Link the inline date to the modal section.
* Fix empty thumbnail preview.

= 0.7.8 =

* Even better title guess.
* Fixes media button and switch toolbar button in Firefox and IE.
* Adds a dummy featured image to simulate to styles.
* Avoid creating a global variable.
* Convert version and plugin variables to constants.
* Force get_the_title() to be true if there is no title.
* Generalised link to back-end.

= 0.7.7 =

* Better title guess.

= 0.7.6 =

* Properly unset $current_screen.
* Update post format class when changing it.

= 0.7.5 =

* Fade fast for inline TinyMCE containers.
* Title now editable based on .entry-title instead of php filter.
* Refresh page on update.
* Unset $current_screen because it causes is_admin() to return true.
* Require jQuery for wp-fee-adminbar.js.

= 0.7.4 =

* Update CSS resets for .wp-core-ui.

= 0.7.3 =

* Fixed revision links.
* Simple temporary link button.

= 0.7.2 =

* Button to back-end.
* TinyMCE 4.0.12.
* Editable galleries and captions.

= 0.7.1 =

* Added post.js replacement for versions lower than 3.9-alpha because it's incompatible with TinyMCE 4.x.

= 0.7 =

* Maximum version to 4.0-alpha.
* Meta modal.
* Only filter the_content etc. after wp_head.

= 0.6.3 =

* CSS reset for TinyMCE's panels.

= 0.6.2 =

* Adds TinyMCE's colour, background colour and table buttons.

= 0.6.1 =

* Adds TinyMCE's formatselect.

= 0.6 =

* Allows new posts and pages to be created on the front-end.
* Adds placeholder for title and content.

= 0.5.1 =

* Only replace document.title when there is a title.
* Added shortcuts for 'save' and 'cancel'.
* Edit raw title instead of final title.

= 0.5 =

* Moves the TinyMCE tool bar into the admin bar.

= 0.4.6 =

* Prevents wpActiveEditor error.
* Makes sure title, content and featured image are only filtered in the main loop.

= 0.4.5 =

* Fixed tag addition.
* Static front page can be edited now.
* Changed interface for saving.

= 0.4.4 =

* Edit links should now work with all kinds of permalink structures.
* Added links to the editor in the back-end.

= 0.4.3 =

* oEmbed previews.
* Editable featured image.
* Caption preview.

= 0.4.2 =

* Allow style tag in TinyMCE.

= 0.4.1 =

* Gallery previews.

= 0.4 =

* Moved the toolbar inside the admin bar.

= 0.3.2 =

* Minimum WordPress version: 3.8-alpha

= 0.3.1 =

* Removed mp6 dependency
* Fixed permalinks
* Added wordpressdotorg as a contributor
* Updated to TinyMCE 4.0.10

= 0.3 =

* Updated to TinyMCE 4.0.6

= 0.2 =

* Refresh rewrite rules on activation

= 0.1 =

* Initial release
