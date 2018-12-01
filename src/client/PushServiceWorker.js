self.addEventListener('push', function(event) {
  var promise = self.registration.showNotification(event.data.text());

  event.waitUntil(promise);
});