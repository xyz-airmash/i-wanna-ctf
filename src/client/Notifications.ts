export const getNotificationPermission = () => {
  return Notification.requestPermission().then(async result => {
    if (result === 'granted') {
      return result;
    }
    throw new Error();
  });
};

export const startPushSubscription = async (vapidKey: string): Promise<any> => {
  await getNotificationPermission();
  await unsubscribe();
  if (!navigator.serviceWorker) {
    return;
  }
  let registration = await navigator.serviceWorker.getRegistration();
  if (!registration) {
    await navigator.serviceWorker.register('/PushServiceWorker.js');
    registration = await navigator.serviceWorker.ready;
  }
  if (!registration.active) {
    return;
  }
  const pushSubscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey)
  });
  return pushSubscription;
}

export const getSubscription = async () => {
  await getNotificationPermission();
  if (!navigator.serviceWorker) {
    return;
  }
  let registration = await navigator.serviceWorker.getRegistration()
  if (registration) {
    return registration.pushManager.getSubscription();
  }
}

export const unsubscribe = async () => {
  await getNotificationPermission();
  if (!navigator.serviceWorker) {
    return;
  }
  let registration = await navigator.serviceWorker.getRegistration()
  if (registration) {
    let subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      subscription.unsubscribe();
    }
    //registration.unregister();
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
