/* =========================================================
   INJAZ1 — SERVICE WORKER
   GitHub Pages / PWA
   Version: 3.0.0
========================================================= */

"use strict";

const CACHE_NAME = "injaz1-v3";

const APP_SHELL = [
    "./",
    "./index.html",
    "./style.css",
    "./app.js",
    "./manifest.json",
    "./icons/icon-192.jpeg",
    "./icons/icon-512.jpeg",
    "./sounds/reminder.mp3",
    "./sounds/important.mp3",
    "./sounds/success.mp3"
];

/* =========================================================
   INSTALL
========================================================= */

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});


/* =========================================================
   ACTIVATE
========================================================= */

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys()
            .then(keys =>
                Promise.all(
                    keys
                        .filter(key => key !== CACHE_NAME)
                        .map(key => caches.delete(key))
                )
            )
            .then(() => self.clients.claim())
    );
});


/* =========================================================
   FETCH
========================================================= */

self.addEventListener("fetch", event => {
    if (event.request.method !== "GET") {
        return;
    }

    const request = event.request;

    event.respondWith(
        caches.match(request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    return cachedResponse;
                }

                return fetch(request)
                    .then(response => {
                        if (
                            !response ||
                            response.status !== 200 ||
                            response.type === "opaque"
                        ) {
                            return response;
                        }

                        const clonedResponse = response.clone();

                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(request, clonedResponse);
                            })
                            .catch(() => {});

                        return response;
                    })
                    .catch(() => {
                        if (request.mode === "navigate") {
                            return caches.match("./index.html");
                        }

                        return new Response("", {
                            status: 503,
                            statusText: "Offline"
                        });
                    });
            })
    );
});


/* =========================================================
   PUSH NOTIFICATIONS
========================================================= */

self.addEventListener("push", event => {
    let data = {
        title: "Injaz1",
        body: "لديك مهمة تحتاج إلى إنجازها.",
        icon: "./icons/icon-192.jpeg",
        badge: "./icons/icon-192.jpeg",
        tag: "injaz1-task",
        url: "./index.html"
    };

    if (event.data) {
        try {
            const incoming = event.data.json();

            if (incoming && typeof incoming === "object") {
                data = {
                    ...data,
                    ...incoming
                };
            }
        } catch {
            data.body = event.data.text();
        }
    }

    const options = {
        body: String(data.body || "لديك مهمة تحتاج إلى إنجازها."),
        icon: data.icon || "./icons/icon-192.jpeg",
        badge: data.badge || "./icons/icon-192.jpeg",
        tag: data.tag || "injaz1-task",
        renotify: true,
        requireInteraction: true,
        vibrate: [200, 100, 200],
        timestamp: Date.now(),
        data: {
            url: data.url || "./index.html"
        }
    };

    event.waitUntil(
        self.registration.showNotification(
            data.title || "Injaz1",
            options
        )
    );
});


/* =========================================================
   NOTIFICATION CLICK
========================================================= */

self.addEventListener("notificationclick", event => {
    event.notification.close();

    const targetUrl =
        event.notification.data?.url ||
        "./index.html";

    event.waitUntil(
        clients.matchAll({
            type: "window",
            includeUncontrolled: true
        })
        .then(clientList => {

            for (const client of clientList) {
                if ("focus" in client) {

                    if ("navigate" in client) {
                        client.navigate(targetUrl);
                    }

                    return client.focus();
                }
            }

            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }

            return undefined;
        })
    );
});


/* =========================================================
   NOTIFICATION CLOSE
========================================================= */

self.addEventListener("notificationclose", event => {
    // Reserved for future analytics or notification handling.
});


/* =========================================================
   MESSAGE FROM APP
========================================================= */

self.addEventListener("message", event => {
    const message = event.data;

    if (!message || typeof message !== "object") {
        return;
    }


    /* -----------------------------------------
       SHOW NOTIFICATION
    ----------------------------------------- */

    if (message.type === "SHOW_NOTIFICATION") {

        const notification =
            message.notification || {};

        const options = {
            body:
                notification.body ||
                "لديك مهمة جديدة.",

            icon:
                notification.icon ||
                "./icons/icon-192.jpeg",

            badge:
                notification.badge ||
                "./icons/icon-192.jpeg",

            tag:
                notification.tag ||
                "injaz1",

            renotify: true,

            requireInteraction:
                notification.requireInteraction !== false,

            vibrate:
                Array.isArray(notification.vibrate)
                    ? notification.vibrate
                    : [200, 100, 200],

            timestamp:
                Date.now(),

            data: {
                url:
                    notification.url ||
                    "./index.html"
            }
        };

        event.waitUntil(
            self.registration.showNotification(
                notification.title || "Injaz1",
                options
            )
        );
    }


    /* -----------------------------------------
       SKIP WAITING
    ----------------------------------------- */

    if (message.type === "SKIP_WAITING") {
        self.skipWaiting();
    }


    /* -----------------------------------------
       CLEAR CACHES
    ----------------------------------------- */

    if (message.type === "CLEAR_CACHE") {

        event.waitUntil(
            caches.keys()
                .then(keys =>
                    Promise.all(
                        keys.map(key =>
                            caches.delete(key)
                        )
                    )
                )
        );
    }
});