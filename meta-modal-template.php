<form id="wp-fee-meta-modal" style="display: none;">
	<input type="hidden" id="post_ID" name="post_ID" value="<?php echo $post->ID; ?>">
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
											<a id="media-menu-<?php echo $section['id']; ?>" class="media-menu-item<?php echo $i === 1 ? ' active' : ''; ?>" href="#"  data-box="<?php echo $section['id']; ?>"><?php echo $section['title']; ?></a>
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
				<?php

				$i = 0;

				foreach ( $wp_meta_modal_sections as $context => $priorities ) {

					if ( is_array( $priorities ) ) {

						foreach ( $priorities as $priority => $sections ) {

							if ( is_array( $sections ) ) {

								foreach ( $sections as $section ) {

									$i++;

									?>
									<div id="wp-fee-box-<?php echo $section['id'] ?>" class="wp-fee-box" style="display: <?php echo $i === 1 ? 'block' : 'none'; ?>;">
										<div class="media-frame-title">
											<h1><?php echo $section['title']; ?></h1>
										</div>
										<div class="media-frame-router">
											<div class="media-router">
												<a class="media-menu-item" href="#"></a>
											</div>
										</div>
										<div class="media-frame-content" id="<?php echo $section['id']; ?>" style="padding: 16px;">
											<div class="inside">
												<?php call_user_func( $section['callback'], $post, $section ); ?>
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
									<?php

								}

							}

						}

					}

				}

				?>
			</div>
		</div>
	</div>
	<div class="media-modal-backdrop"></div>
</form>