const fs = require('fs');
const path = require('path');
const { query, get, run } = require('./server/database.js');

// Mapeo de nombres de periódicos a sus URLs
const NEWSPAPER_URLS = {
    'REFORMA': 'https://www.reforma.com',
    'El Sol de México': 'https://www.elsoldemexico.com.mx',
    'EL UNIVERSAL': 'https://www.eluniversal.com.mx',
    'EXCELSIOR': 'https://www.excelsior.com.mx',
    'MILENIO': 'https://www.milenio.com',
    'La Jornada': 'https://www.jornada.com.mx',
    'CRÓNICA': 'https://www.cronica.com.mx',
    'EL HERALDO': 'https://www.elheraldodemexico.com.mx',
    'El Financiero': 'https://www.elfinanciero.com.mx',
    'EL ECONOMISTA': 'https://www.eleconomista.com.mx',
    'Indigo': 'https://www.reporteindigo.com',
    'ContraRéplica': 'https://www.contrareplica.mx',
    'DIARIO DE MÉXICO': 'https://www.diariodemexico.com.mx'
};

// Mapa de páginas a periódicos (basado en las imágenes analizadas)
const PAGE_TO_NEWSPAPERS = {
    2: ['REFORMA', 'El Sol de México', 'EL UNIVERSAL', 'EXCELSIOR', 'MILENIO'],
    3: ['La Jornada', 'CRÓNICA', 'EL HERALDO', 'El Financiero', 'EL ECONOMISTA', 'Indigo'],
    4: ['ContraRéplica', 'DIARIO DE MÉXICO']
};

async function fixOchoColumnasUrls() {
    console.log('=== ARREGLANDO URLs DE OCHO COLUMNAS ===\n');
    
    try {
        // Buscar artículos de ocho-columnas del 5 de junio de 2025 que no tengan URL
        const articlesQuery = `
            SELECT id, title, content, publication_date 
            FROM ARTICLE 
            WHERE section_id = 'ocho-columnas'
            AND date(publication_date) = '2025-06-05'
            AND (url IS NULL OR url = '')
            ORDER BY id
        `;
        
        const articles = await query(articlesQuery);
        console.log(`Encontrados ${articles.length} artículos de ocho-columnas sin URL`);
        
        if (articles.length === 0) {
            console.log('No hay artículos para procesar');
            return;
        }
        
        // Procesar cada artículo
        let updatedCount = 0;
        
        for (const article of articles) {
            console.log(`\nProcesando artículo ID ${article.id}: "${article.title}"`);
            
            // Determinar qué página corresponde a este artículo basado en su posición
            // Asumiendo que los artículos están ordenados por aparición en las páginas
            let page = 2; // Página inicial
            let articleIndex = articles.indexOf(article);
            
            // Distribución aproximada basada en el contenido observado:
            // Página 2: ~6 artículos, Página 3: ~6 artículos, Página 4: ~2 artículos
            if (articleIndex >= 6 && articleIndex < 12) {
                page = 3;
            } else if (articleIndex >= 12) {
                page = 4;
            }
            
            // Buscar un periódico que coincida con el contenido del título o artículo
            let matchedNewspaper = null;
            let matchedUrl = null;
            
            // Primero, buscar coincidencias directas en el título
            for (const newspaper of PAGE_TO_NEWSPAPERS[page] || []) {
                const normalizedTitle = article.title.toLowerCase();
                const normalizedNewspaper = newspaper.toLowerCase();
                
                if (normalizedTitle.includes(normalizedNewspaper.toLowerCase()) ||
                    normalizedTitle.includes(newspaper.replace(/[^a-zA-Z]/g, '').toLowerCase())) {
                    matchedNewspaper = newspaper;
                    matchedUrl = NEWSPAPER_URLS[newspaper];
                    break;
                }
            }
            
            // Si no hay coincidencia directa, asignar por posición en la página
            if (!matchedNewspaper) {
                const newspapersInPage = PAGE_TO_NEWSPAPERS[page] || [];
                if (newspapersInPage.length > 0) {
                    // Asignar el primer periódico disponible de esa página
                    const indexInPage = articleIndex - (page === 2 ? 0 : page === 3 ? 6 : 12);
                    const newspaperIndex = Math.min(indexInPage, newspapersInPage.length - 1);
                    matchedNewspaper = newspapersInPage[newspaperIndex];
                    matchedUrl = NEWSPAPER_URLS[matchedNewspaper];
                }
            }
            
            if (matchedUrl) {
                console.log(`  Asignando URL: ${matchedUrl} (${matchedNewspaper})`);
                
                // Actualizar el artículo con la URL
                const updateQuery = `
                    UPDATE ARTICLE 
                    SET url = ?, source = ?
                    WHERE id = ?
                `;
                
                await run(updateQuery, [matchedUrl, matchedNewspaper, article.id]);
                updatedCount++;
            } else {
                console.log(`  ⚠️ No se pudo determinar URL para este artículo`);
            }
        }
        
        console.log(`\n✅ Proceso completado. Actualizados ${updatedCount} artículos con URLs`);
        
        // Verificar los resultados
        console.log('\n--- Verificación de resultados ---');
        const verificationQuery = `
            SELECT id, title, url, source
            FROM ARTICLE 
            WHERE section_id = 'ocho-columnas'
            AND date(publication_date) = '2025-06-05'
            ORDER BY id
        `;
        
        const verificationResults = await query(verificationQuery);
        verificationResults.forEach(article => {
            console.log(`ID ${article.id}: ${article.source || 'Sin source'} - ${article.url || 'Sin URL'}`);
        });
        
    } catch (error) {
        console.error('Error procesando artículos:', error);
    }
}

fixOchoColumnasUrls().catch(console.error);