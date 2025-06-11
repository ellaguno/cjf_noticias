import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-800 text-white py-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">Portal de Noticias Judiciales</h3>
            <p className="text-gray-300">
              Información extraída del Resumen Informativo diario publicado por el Consejo de la Judicatura Federal.
            </p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Enlaces</h3>
            <ul className="space-y-2">
              <li>
                <Link href="https://www.cjf.gob.mx/" className="text-gray-300 hover:text-white">
                  Consejo de la Judicatura Federal
                </Link>
              </li>
              <li>
                <Link href="https://www.scjn.gob.mx/" className="text-gray-300 hover:text-white">
                  Suprema Corte de Justicia de la Nación
                </Link>
              </li>
              <li>
                <Link href="https://www.te.gob.mx/" className="text-gray-300 hover:text-white">
                  Tribunal Electoral del Poder Judicial de la Federación
                </Link>
              </li>
              <li>
                <Link href="https://www.dof.gob.mx/" className="text-gray-300 hover:text-white">
                  Diario Oficial de la Federación
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Fuente</h3>
            <p className="text-gray-300">
              La información presentada en este portal es extraída del Resumen Informativo diario publicado por el Consejo de la Judicatura Federal en:
            </p>
            <a 
              href="https://www.cjf.gob.mx/SinInformativa/resumenInformativo.pdf" 
              className="text-blue-400 hover:text-blue-300 mt-2 inline-block"
              target="_blank"
              rel="noopener noreferrer"
            >
              Resumen Informativo CJF
            </a>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-gray-700 text-center text-gray-400">
          <p>© {currentYear} Portal de Noticias Judiciales. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}