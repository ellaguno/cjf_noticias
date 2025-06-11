const { query, run } = require('./server/database.js');

// Mapeo de nombres de fuente a nombres de archivo de portada
const SOURCE_TO_PORTADA = {
    'REFORMA': 'portada-reforma.png', // No está disponible
    'El Sol de México': 'portada-el-sol-de-méxico.png',
    'EL UNIVERSAL': 'portada-el-universal.png',
    'EXCELSIOR': 'portada-excelsior.png',
    'MILENIO': 'portada-milenio.png',
    'La Jornada': 'portada-la-jornada.png',
    'CRÓNICA': 'portada-cronica.png', // No está disponible
    'EL HERALDO': 'portada-el-heraldo.png', // No está disponible
    'El Financiero': 'portada-el-financiero.png',
    'EL ECONOMISTA': 'portada-el-economista.png',
    'Indigo': 'portada-reporte-indigo.png',
    'ContraRéplica': 'portada-contrareplica.png', // No está disponible
    'DIARIO DE MÉXICO': 'portada-diario-de-mexico.png' // No está disponible
};

async function associatePortadasToSources() {
    console.log('=== ASOCIANDO PORTADAS CORRECTAS A FUENTES ===\n');
    
    try {
        // Obtener todos los artículos de ocho-columnas del 5 de junio con source
        const articlesQuery = `
            SELECT id, title, source, url
            FROM ARTICLE 
            WHERE section_id = 'ocho-columnas'
            AND date(publication_date) = '2025-06-05'
            AND source IS NOT NULL
            ORDER BY id
        `;
        
        const articles = await query(articlesQuery);
        console.log(`Encontrados ${articles.length} artículos con fuente`);
        
        // Obtener todas las imágenes de portadas disponibles
        const portadasQuery = `
            SELECT id, filename, article_id
            FROM IMAGE 
            WHERE section_id = 'ocho-columnas'
            AND date(publication_date) = '2025-06-05'
            AND filename LIKE 'portada-%'
            ORDER BY filename
        `;
        
        const portadas = await query(portadasQuery);
        console.log(`Portadas disponibles: ${portadas.length}`);
        
        portadas.forEach(portada => {
            const associationInfo = portada.article_id ? `-> Artículo ${portada.article_id}` : '(Sin asociar)';
            console.log(`  ${portada.filename} ${associationInfo}`);
        });
        
        console.log('\n--- Procesando asociaciones ---');
        
        let correctAssociations = 0;
        let reassignments = 0;
        
        // Primero, liberar todas las asociaciones incorrectas
        for (const portada of portadas) {
            if (portada.article_id) {
                const clearQuery = `UPDATE IMAGE SET article_id = NULL WHERE id = ?`;
                await run(clearQuery, [portada.id]);
            }
        }
        
        console.log('Todas las portadas han sido desasociadas para reasignación correcta\n');
        
        // Ahora asociar correctamente cada artículo con su portada correspondiente
        for (const article of articles) {
            const expectedPortada = SOURCE_TO_PORTADA[article.source];
            
            if (!expectedPortada) {
                console.log(`❌ ${article.source}: No hay mapeo de portada definido`);
                continue;
            }
            
            // Buscar la portada correspondiente
            const matchingPortada = portadas.find(p => p.filename === expectedPortada);
            
            if (matchingPortada) {
                console.log(`✅ ${article.source}: Asociando con ${expectedPortada}`);
                
                const updateQuery = `
                    UPDATE IMAGE 
                    SET article_id = ?,
                        title = ?,
                        description = ?
                    WHERE id = ?
                `;
                
                const imageTitle = `Portada ${article.source}`;
                const imageDescription = `Portada del periódico ${article.source} correspondiente a artículo: ${article.title}`;
                
                await run(updateQuery, [
                    article.id,
                    imageTitle,
                    imageDescription,
                    matchingPortada.id
                ]);
                
                correctAssociations++;
            } else {
                console.log(`⚠️ ${article.source}: Portada ${expectedPortada} no encontrada en base de datos`);
            }
        }
        
        console.log(`\n✅ Proceso completado:`);
        console.log(`  - Asociaciones correctas realizadas: ${correctAssociations}`);
        
        // Verificar resultados finales
        console.log('\n--- Verificación final ---');
        const verificationQuery = `
            SELECT a.id, a.title, a.source, i.filename
            FROM ARTICLE a
            LEFT JOIN IMAGE i ON a.id = i.article_id
            WHERE a.section_id = 'ocho-columnas'
            AND date(a.publication_date) = '2025-06-05'
            AND a.source IS NOT NULL
            ORDER BY a.source, a.id
        `;
        
        const results = await query(verificationQuery);
        
        // Agrupar por fuente
        const groupedResults = {};
        results.forEach(result => {
            if (!groupedResults[result.source]) {
                groupedResults[result.source] = [];
            }
            groupedResults[result.source].push(result);
        });
        
        Object.keys(groupedResults).forEach(source => {
            console.log(`\n${source}:`);
            groupedResults[source].forEach(result => {
                const imageInfo = result.filename || 'Sin imagen';
                console.log(`  ID ${result.id}: ${imageInfo}`);
            });
        });
        
    } catch (error) {
        console.error('Error asociando portadas:', error);
    }
}

associatePortadasToSources().catch(console.error);