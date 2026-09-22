// Form submission + lightweight event tracking
(function(){
  const WORKER_URL = 'https://westcore-form-worker.westcoreequipment.workers.dev';

  function trackEvent(event, data){
    try{
      console.log('trackEvent', event, data);
      if(navigator.sendBeacon){
        navigator.sendBeacon('/track', JSON.stringify({event, data}));
      }
    }catch(e){ console.warn(e); }
  }

  document.addEventListener('DOMContentLoaded', function(){
    const form   = document.getElementById('contact-form');
    const result = document.getElementById('contact-result');

    if(form){
      form.addEventListener('submit', async function(e){
        e.preventDefault();

        const data = {};
        new FormData(form).forEach((v, k) => data[k] = v);

        trackEvent('lead_submitted', { industry: data.industry || 'unknown' });

        const submitBtn = form.querySelector('[type="submit"]');
        submitBtn.disabled = true;
        result.textContent = 'Sending…';
        result.style.color  = '';

        try {
          const res = await fetch(WORKER_URL, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(data),
          });

          if(res.ok){
            result.textContent = 'Thank you — our engineer will contact you within 1 business day.';
            result.style.color = '#1a6e2e';
            form.reset();
          } else {
            const msg = await res.text();
            throw new Error(msg);
          }
        } catch(err){
          console.error('Form error:', err);
          result.textContent = 'Submission failed. Please email info@westcoreequipment.com';
          result.style.color = '#a82727';
          submitBtn.disabled = false;
        }
      });
    }

    const dlBtn = document.getElementById('download-brochure');
    if(dlBtn){
      dlBtn.addEventListener('click', function(){
        trackEvent('brochure_download', { page: window.location.pathname });
        window.location.href = '/assets/product-brochure.pdf';
      });
    }
  });
})();
