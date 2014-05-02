<div id="wp-fee-notice-area" class="wp-core-ui">
	<?php if ( $notice ) : ?>
	<div id="notice" class="error"><p id="has-newer-autosave"><?php echo $notice ?></p><div class="dashicons dashicons-dismiss"></div></div>
	<?php endif; ?>
	<?php if ( $message ) : ?>
	<div id="message" class="updated"><p><?php echo $message; ?></p></div>
	<?php endif; ?>
	<div id="lost-connection-notice" class="error hidden">
		<p><span class="spinner"></span> <?php _e( '<strong>Connection lost.</strong> Saving has been disabled until you&#8217;re reconnected.' ); ?>
		<span class="hide-if-no-sessionstorage"><?php _e( 'We&#8217;re backing up this post in your browser, just in case.' ); ?></span>
		</p>
	</div>
</div>
<div id="local-storage-notice" class="hidden">
	<p class="local-restore">
		The backup of this post in your browser is different from the version below. <a class="restore-backup" href="#">Restore the backup.</a>
	</p>
	<p class="undo-restore hidden">
		Post restored successfully. <a class="undo-restore-backup" href="#">Undo.</a>
	</p>
	<div class="dashicons dashicons-dismiss"></div>
</div>
<form id="wp-fee-meta-modal" style="display: none;">
	<input type="hidden" id="post_ID" name="post_ID" value="<?php echo $post->ID; ?>">
	<input type="hidden" id="post_type" name="post_type" value="<?php echo $post->post_type; ?>">
	<input type="hidden" id="post_author" name="post_author" value="<?php echo $post->post_author; ?>">
	<?php wp_nonce_field( 'update-post_' . $post->ID ); ?>
	<?php if ( ! empty( $active_post_lock ) ) { ?>
	<input type="hidden" id="active_post_lock" value="<?php echo esc_attr( implode( ':', $active_post_lock ) ); ?>">
	<?php } ?>
	<div class="media-modal wp-core-ui">
		<a class="media-modal-close" href="#" title="Close">
			<span class="media-modal-icon"></span>
		</a>
		<div class="media-modal-content">
			<div class="media-frame wp-core-ui hide-router">
				<div class="media-frame-menu">
					<div class="media-menu">
						<?php

						$i = 0;

						ksort( $wp_meta_modal_sections );

						$array_keys = array_keys( $wp_meta_modal_sections );

						foreach ( $wp_meta_modal_sections as $context => $priorities ) {

							if ( is_array( $priorities ) ) {

								ksort( $priorities );

								foreach ( $priorities as $priority => $sections ) {

									if ( is_array( $sections ) ) {

										foreach ( $sections as $section ) {

											$i++;

											?>
											<a id="media-menu-<?php echo $section['id']; ?>" class="media-menu-item<?php echo $i === 1 ? ' active' : ''; ?>" href="#" data-box="<?php echo $section['id']; ?>"><?php echo $section['title']; ?></a>
											<?php

										}

									}

								}

								if ( $context !== end( $array_keys ) ) {

									?>
									<div class="separator"></div>
									<?php

								}

							}

						}

						?>
					</div>
				</div>
				<div class="media-frame-title">
					<h1>Publish</h1>
				</div>
				<div class="media-frame-content" style="top: 0;border-top: none;">
					<div class="media-frame-content-inner" style="position: relative;">
					<?php
	
					$i = 0;
	
					foreach ( $wp_meta_modal_sections as $context => $priorities ) {
	
						if ( is_array( $priorities ) ) {

							ksort( $priorities );
	
							foreach ( $priorities as $priority => $sections ) {
	
								if ( is_array( $sections ) ) {
	
									foreach ( $sections as $section ) {
	
										$i++;
	
										?>
										<div id="wp-fee-meta-modal-box-<?php echo $section['id']; ?>" class="wp-fee-meta-modal-box" data-box="<?php echo $section['id']; ?>">
											<div class="media-frame-sub-title<?php echo $i === 1 ? ' media-frame-sub-title-first' : ''; ?>" data-box="<?php echo $section['id']; ?>">
												<h1><?php echo $section['title']; ?></h1>
											</div>
											<div id="<?php echo $section['id']; ?>" style="padding: 16px;">
												<div class="inside">
													<?php call_user_func( $section['callback'], $post, $section ); ?>
												</div>
											</div>
										</div>
										<?php
	
									}
	
								}
	
							}
	
						}
	
					}
	
					?>
					</div>
				</div>
				<div class="media-frame-toolbar">
					<div class="media-toolbar">
						<div class="media-toolbar-secondary"></div>
						<div class="media-toolbar-primary">
							<a id="wp-fee-met-continue" class="button button-primary media-button button-large" href="#">Continue editing</a>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
	<div class="media-modal-backdrop"></div>
</form>