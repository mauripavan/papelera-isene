export default function Footer() {
  return (
    <div className='flex flex-col md:flex-row border-t-2 font-nunito p-4 gap-8'>
      <div className='flex-1'>
        <p>Av. Crovara 1532 - Ciudad Madero - Buenos Aires</p>
        <p>4652-4650</p>
        <p>
          WhatsApp:{' '}
          <a href='https://wa.me/5491130403101' className='underline'>
            1167584820
          </a>
        </p>
        <p>
          Mail:{' '}
          <a href='mailto:papeleraisene@yahoo.com.ar' className='underline'>
            papeleraisene@yahoo.com.ar
          </a>
        </p>
      </div>

      <div className='flex flex-1 md:justify-end'>
        <p className='md:text-right'>
          Copyright © 2024 - Papelera Isene - Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}
