const { query } = require('./server/database.js');

async function checkImagesDatabase() {
    console.log('=== REVISANDO IMÁGENES EN BASE DE DATOS ===\n');
    
    try {
        // Obtener todas las imágenes de ocho-columnas del 5 de junio
        const imagesQuery = `
            SELECT id, filename, title, description, article_id, publication_date
            FROM IMAGE 
            WHERE section_id = 'ocho-columnas'
            AND date(publication_date) = '2025-06-05'
            ORDER BY filename
        `;
        
        const images = await query(imagesQuery);
        console.log(`Total de imágenes de ocho-columnas del 5 de junio: ${images.length}\n`);
        
        images.forEach(image => {
            const articleInfo = image.article_id ? `Asociada a artículo ${image.article_id}` : 'Sin asociar';
            console.log(`ID ${image.id}: ${image.filename} - ${articleInfo}`);
        });
        
        console.log('\n--- Conteo por tipo de imagen ---');
        
        // Contar por tipo
        const batchImages = images.filter(img => img.filename.includes('batch-'));
        const pageImages = images.filter(img => img.filename.includes('page-'));
        const portadaImages = images.filter(img => img.filename.includes('portada-'));
        
        console.log(`Imágenes batch: ${batchImages.length}`);
        console.log(`Imágenes page: ${pageImages.length}`);
        console.log(`Imágenes portada: ${portadaImages.length}`);
        
        console.log('\n--- Imágenes batch específicas ---');
        batchImages.forEach(image => {
            const articleInfo = image.article_id ? `Asociada a artículo ${image.article_id}` : 'Sin asociar';
            console.log(`  ${image.filename} - ${articleInfo}`);
        });
        
    } catch (error) {
        console.error('Error consultando imágenes:', error);
    }
}

checkImagesDatabase().catch(console.error);