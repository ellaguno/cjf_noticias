const fs = require('fs');
const path = require('path');
const { query, get, run } = require('./server/database.js');

// Mapeo de periódicos a sus páginas correspondientes
const NEWSPAPER_TO_PAGE = {
    'REFORMA': 2,
    'El Sol de México': 2, 
    'EL UNIVERSAL': 2,
    'EXCELSIOR': 2,
    'MILENIO': 2,
    'La Jornada': 3,
    'CRÓNICA': 3,
    'EL HERALDO': 3,
    'El Financiero': 3,
    'EL ECONOMISTA': 3,
    'Indigo': 3,
    'ContraRéplica': 4,
    'DIARIO DE MÉXICO': 4
};

async function associateNewspaperImages() {
    console.log('=== ASOCIANDO IMÁGENES A ARTÍCULOS DE OCHO COLUMNAS ===\n');
    
    try {
        // Obtener todos los artículos de ocho-columnas del 5 de junio con source y URL
        const articlesQuery = `
            SELECT id, title, source, url
            FROM ARTICLE 
            WHERE section_id = 'ocho-columnas'
            AND date(publication_date) = '2025-06-05'
            AND source IS NOT NULL
            ORDER BY id
        `;
        
        const articles = await query(articlesQuery);
        console.log(`Encontrados ${articles.length} artículos de ocho-columnas con fuente`);
        
        if (articles.length === 0) {
            console.log('No hay artículos para procesar');
            return;
        }
        
        // Obtener las imágenes de ocho-columnas del mismo día
        const imagesQuery = `
            SELECT id, filename, title, description
            FROM IMAGE 
            WHERE section_id = 'ocho-columnas'
            AND date(publication_date) = '2025-06-05'
            AND (article_id IS NULL OR article_id = '')
            ORDER BY filename
        `;
        
        const images = await query(imagesQuery);
        console.log(`Encontradas ${images.length} imágenes sin asociar`);
        
        // Mapear imágenes por página (batch-02.png = página 2, etc.)
        const imagesByPage = {
            2: images.filter(img => img.filename.includes('batch-02')),
            3: images.filter(img => img.filename.includes('batch-03')),
            4: images.filter(img => img.filename.includes('batch-04'))
        };
        
        console.log(`Imágenes por página:`);
        console.log(`  Página 2: ${imagesByPage[2].length} imágenes`);
        console.log(`  Página 3: ${imagesByPage[3].length} imágenes`);
        console.log(`  Página 4: ${imagesByPage[4].length} imágenes`);
        
        let associatedCount = 0;
        
        // Procesar cada artículo
        for (const article of articles) {
            console.log(`\nProcesando artículo ID ${article.id}: "${article.title}"`);
            console.log(`  Fuente: ${article.source}`);
            
            // Determinar la página basada en la fuente
            const page = NEWSPAPER_TO_PAGE[article.source];
            
            if (!page) {
                console.log(`  ⚠️ No se pudo determinar página para la fuente: ${article.source}`);
                continue;
            }
            
            // Buscar imagen disponible para esa página
            const availableImages = imagesByPage[page];
            
            if (availableImages && availableImages.length > 0) {
                // Usar la primera imagen disponible
                const imageToAssociate = availableImages[0];
                
                console.log(`  Asociando imagen: ${imageToAssociate.filename}`);
                
                // Actualizar la imagen para asociarla al artículo
                const updateQuery = `
                    UPDATE IMAGE 
                    SET article_id = ?,
                        title = ?,
                        description = ?
                    WHERE id = ?
                `;
                
                const imageTitle = `${article.source} - ${article.title}`;
                const imageDescription = `Artículo de ${article.source}: ${article.title}`;
                
                await run(updateQuery, [
                    article.id,
                    imageTitle,
                    imageDescription,
                    imageToAssociate.id
                ]);
                
                // Remover la imagen de la lista para que no se use dos veces
                const index = imagesByPage[page].indexOf(imageToAssociate);
                imagesByPage[page].splice(index, 1);
                
                associatedCount++;
                console.log(`  ✅ Imagen asociada correctamente`);
            } else {
                console.log(`  ⚠️ No hay imágenes disponibles para la página ${page}`);
            }
        }
        
        console.log(`\n✅ Proceso completado. Asociadas ${associatedCount} imágenes a artículos`);
        
        // Verificar los resultados
        console.log('\n--- Verificación de resultados ---');
        const verificationQuery = `
            SELECT a.id, a.title, a.source, i.filename, i.title as image_title
            FROM ARTICLE a
            LEFT JOIN IMAGE i ON a.id = i.article_id
            WHERE a.section_id = 'ocho-columnas'
            AND date(a.publication_date) = '2025-06-05'
            AND a.source IS NOT NULL
            ORDER BY a.id
        `;
        
        const verificationResults = await query(verificationQuery);
        verificationResults.forEach(result => {
            const imageInfo = result.filename ? `${result.filename}` : 'Sin imagen';
            console.log(`ID ${result.id}: ${result.source} - ${imageInfo}`);
        });
        
        // Contar imágenes sin asociar
        const unassociatedImagesQuery = `
            SELECT COUNT(*) as count
            FROM IMAGE 
            WHERE section_id = 'ocho-columnas'
            AND date(publication_date) = '2025-06-05'
            AND (article_id IS NULL OR article_id = '')
        `;
        
        const unassociatedResult = await get(unassociatedImagesQuery);
        console.log(`\nImágenes sin asociar restantes: ${unassociatedResult.count}`);
        
    } catch (error) {
        console.error('Error asociando imágenes:', error);
    }
}

associateNewspaperImages().catch(console.error);