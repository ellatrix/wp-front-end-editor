# WordPress Front-end Editor

![WordPress Front-end Editor](http://make.wordpress.org/ui/files/2014/01/Screen-Shot-2014-01-20-at-23.18.25.png)

If you found a bug or if you have ideas, add them to [the GitHub issue tracker](https://github.com/avryl/wp-front-end-editor/issues/new). We’ll also keep a list of tasks there.

**Weekly IRC Chat:** Tuesdays, 17:00 UTC, [#wordpress-ui](http://codex.wordpress.org/IRC).

If you'd like to join our Skype chat, add jannekevandorpe and mention this plugin.

[WordPress Plugin](http://wordpress.org/plugins/wp-front-end-editor/)  
[GitHub](https://github.com/avryl/wp-front-end-editor)  
[Features as Plugins Tracking](http://make.wordpress.org/core/features-as-plugins/)  
[Make WordPress UI Posts](http://make.wordpress.org/ui/tag/front-end-editor/)

## Custom Post Types

Custom post types need to support the Front-end Editor explictly.

```php
add_post_type_support( 'custom-post-type', 'front-end-editor' );
```
