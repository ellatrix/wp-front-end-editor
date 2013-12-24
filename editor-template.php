<div id="fee-saving" class="fee-reset"></div>
<div id="fee-success" class="wp-core-ui fee-reset">
	<div id="fee-message">
		<p id="fee-ajax-message">Post Updated.</p>
		<a id="fee-continue" class="button button-large" href="#">Continue editing</a><a class="button button-primary button-large" href="<?php echo get_permalink($post->ID); ?>">View <?php echo $post->post_type; ?></a>
	</div>
</div>
<div id="fee-mce-toolbar" class="fee-reset fee-element"></div>
<?php wp_nonce_field( 'fee_update_post_' . $post->ID ); ?>
<?php media_buttons( 'fee-edit-content-' . $post->ID ); ?>