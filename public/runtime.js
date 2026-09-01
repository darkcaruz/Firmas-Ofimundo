Office.onReady(() => {});

function onNewMessageComposeHandler(event) {
  try {
    const email = (Office.context.mailbox.userProfile.emailAddress || "").toLowerCase();

    fetch(`/api/signature?email=${encodeURIComponent(email)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        Office.context.mailbox.item.body.setSignatureAsync(
          data.html,
          { coercionType: Office.CoercionType.Html },
          () => event.completed()
        );
      })
      .catch((err) => {
        console.error("No se pudo cargar la firma:", err);
        event.completed();
      });
  } catch (err) {
    console.error(err);
    event.completed();
  }
}

Office.actions.associate("onNewMessageComposeHandler", onNewMessageComposeHandler);
