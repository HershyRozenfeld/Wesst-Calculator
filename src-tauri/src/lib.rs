const CACHE_RESET_SCRIPT: &str = r#"
  if (window.location.href !== 'about:blank') {
    const marker = 'wesst-desktop-cache-reset-v1';
    if (!sessionStorage.getItem(marker)) {
      void (async () => {
        const registrations = 'serviceWorker' in navigator
          ? await navigator.serviceWorker.getRegistrations()
          : [];
        const cacheNames = 'caches' in window ? await caches.keys() : [];
        const hadCachedFrontend = registrations.length > 0 || cacheNames.length > 0;

        await Promise.all(registrations.map((registration) => registration.unregister()));
        await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
        sessionStorage.setItem(marker, 'done');

        if (hadCachedFrontend) window.location.reload();
      })();
    }
  }
"#;

fn desktop_cache_reset_plugin<R: tauri::Runtime>() -> tauri::plugin::TauriPlugin<R> {
    tauri::plugin::Builder::new("desktop-cache-reset")
        .js_init_script(CACHE_RESET_SCRIPT)
        .build()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Remove only the stale PWA cache. IndexedDB and user data remain intact.
        .plugin(desktop_cache_reset_plugin())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
