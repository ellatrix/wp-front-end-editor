# WordPress Front-end Editor

A simple way to write with WordPress.

## Features

* Draft and edit posts.
* Autosaves. There is no “save” button, just publish when you’re done.
* Contextual toolbar for formatting and linking.
* Add media with the WordPress media library.
* Add a featured image (if your theme supports it).

## Custom Post Types Support

```
add_post_type_support( 'page', 'front-end-editor' );
```

Note that this may change in the future. Please make sure you also support the [REST API](http://v2.wp-api.org/extending/custom-content-types/).
