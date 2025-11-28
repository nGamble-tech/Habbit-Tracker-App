self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data.json();
  } catch (err) {
    // Fallback for non-JSON messages (like DevTools test)
    data = {
      title: "Habit Reminder",
      body: event.data?.text() || "You have a new reminder!",
    };
  }

  const title = data.title || "Habit Reminder";
  const body = data.body || "Time to check your habits!";
  const icon = "/Lightningbolt.png";
  const badge = "/Lightningbolt.png";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      data,
    })
  );
});
