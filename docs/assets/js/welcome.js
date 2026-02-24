document.addEventListener('DOMContentLoaded', () => {
  // Smooth scroll to instructions section on CTA click
  const btnStart = document.getElementById('btn-start');
  btnStart.addEventListener('click', () => {
    window.location.href = '/';
  });

  // Animate steps on scroll
  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    },
    { threshold: 0.15 },
  );

  document.querySelectorAll('.step, .feature-card').forEach(el => {
    observer.observe(el);
  });
});
