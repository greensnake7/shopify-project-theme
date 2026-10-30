requestAnimationFrame(() => {
  // Optimize INP
  document.addEventListener('alpine:init', () => {
    Alpine.store('xDOM', {
      rePainting: null, // String: alias element re-painting.
    })
  })
})