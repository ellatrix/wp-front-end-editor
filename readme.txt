=== WordPress Front-end Editor ===

Contributors: avryl, wordpressdotorg
Tags: front-end editor, inline editing
Requires at least: 3.8
Tested up to: 3.9
Stable tag: 0.10
License: GPLv2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.html

== Description ==

If you found a bug or if you have ideas, add them to [the GitHub issue tracker](https://github.com/avryl/wp-front-end-editor/issues/new). We’ll also keep a list of tasks there.

**Weekly IRC Chat:** Tuesdays, 17:00 UTC, [#wordpress-ui](http://codex.wordpress.org/IRC).

If you'd like to join our Skype chat, add jannekevandorpe and mention this plugin.

[WordPress Plugin](http://wordpress.org/plugins/wp-front-end-editor/)  
[GitHub](https://github.com/avryl/wp-front-end-editor)  
[Features as Plugins Tracking](http://make.wordpress.org/core/features-as-plugins/)  
[Make WordPress UI Posts](http://make.wordpress.org/ui/tag/front-end-editor/)

== Changelog ==

= 0.9.1 =

* Fix link modal.
* Update to TinyMCE 4.0.20.

= 0.9.0 =

* Mobile toolbar.
* Remove underline, justify and colour buttons.
* Add hr button.
* New link modal.
* Fixes 3.9 compat problems.
* Featured image: better placeholder + label.
* Auto add paragraph before/after preview. Remove the insert buttons.

= 0.8.5 =

* Support post locking.
* Support more and nextpage tags.
* Escape all html comments in the post content.

= 0.8.4 =

* Fix autosave for 3.8.
* Add up and down arrow to previews to add a paragraph above and under it.
* Use TinyMCE noneditable plugin.

= 0.8.3 =

* Fix autosave for 3.8.

= 0.8.2 =

* Redirect revision.php properly when coming from the front-end.
* Autosave to server for WP 3.8.
* Separate front-end and back-end field in session storage.
* Remove the front-end tab in the back-end editor.
* Reset button Firefox.
* Fixed tooltip position.

= 0.8.1 =

* Autosave to server.
* Implemented messages.

= 0.8 =

* Autosave: Session Storage.
* Update post.js.
* Update to TinyMCE 4.0.16

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
