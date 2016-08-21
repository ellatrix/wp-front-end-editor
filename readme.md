# Front-end Editor for WordPress

    Contributors:      iseulde, wordpressdotorg, siteground
    Tags:              front-end editor, inline editing
    Requires at least: 4.6
    Tested up to:      4.7
    Stable tag:        2.1.0
    License:           GPL-2.0+
    Donate:            https://iseulde.com/donate

A simple way to write with WordPress.

## Description

### Features

* Draft and edit posts.
* Autosaves. Just publish when you’re done.
* Contextual tools. Bold, italic, strikethrough, link, headings, lists and blockquote.
* Add media with the WordPress media library.
* Handy shortcuts for lists (*, - or 1.), blockquote (>) and horizontal rule (---).
* Automatically embed media from [this list](https://codex.wordpress.org/Embeds). Just paste the URL.
* You can also link text by just pasting the URL over it.
* Add a featured image, if your theme supports it.

### Configure and extend

This plugin is designed to be “plug and play”, but also configurable and extensible.

#### Toolbars and buttons

You can add more buttons to any of the toolbars with the following filters:

* `fee_toolbar_caret` for the caret,
* `fee_toolbar_inline` for normal selections,
* `fee_toolbar_block` for block selections.

E.g.

    add_filter('fee_toolbar_inline', function($buttons){
      return array_merge($buttons, array('subscript'));
    });

See the [Codex page](https://codex.wordpress.org/TinyMCE_Custom_Buttons) and [TinyMCE docs](https://www.tinymce.com/docs/advanced/editor-control-identifiers/#toolbarcontrols) for more information about adding toolbar buttons with TinyMCE.

#### Linking to the editor

You can link to the editor from anywhere on the website with the normal edit link to the admin, and it will be picked up by the plugin. Use `edit_post_link` or similar.

#### Custom Post Types Support

    add_post_type_support( 'page', 'front-end-editor' );

Please make sure you also support the [REST API](http://v2.wp-api.org/extending/custom-content-types/).

#### Disable

If you'd like to disable the editor for certain posts, you can use the `supports_fee` filter.

    // Disable for the post with ID 1.
    add_filter('supports_fee', function($supports, $post) {
      return $post->ID !== 1;
    }, 10, 2);
