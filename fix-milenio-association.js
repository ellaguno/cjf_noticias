const { query, run } = require('./server/database.js');

async function fixMilenioAssociation() {
    console.log('=== CORRIGIENDO ASOCIACIÓN DE MILENIO ===\n');
    
    try {
        // Encontrar los artículos de MILENIO
        const milenioArticlesQuery = `
            SELECT id, title
            FROM ARTICLE 
            WHERE section_id = 'ocho-columnas'
            AND date(publication_date) = '2025-06-05'
            AND source = 'MILENIO'
            ORDER BY id
        `;
        
        const milenioArticles = await query(milenioArticlesQuery);
        console.log(`Artículos de MILENIO encontrados: ${milenioArticles.length}`);
        
        milenioArticles.forEach(article => {
            console.log(`  ID ${article.id}: ${article.title}`);
        });
        
        if (milenioArticles.length === 2) {
            const firstArticleId = milenioArticles[0].id;
            
            console.log(`\nAsociando portada de MILENIO al primer artículo (ID ${firstArticleId})`);
            
            // Buscar la imagen de portada-milenio.png
            const milenioImageQuery = `
                SELECT id FROM IMAGE 
                WHERE filename = 'portada-milenio.png'
                AND section_id = 'ocho-columnas'
                AND date(publication_date) = '2025-06-05'
            `;
            
            const milenioImage = await query(milenioImageQuery);
            
            if (milenioImage.length > 0) {
                const imageId = milenioImage[0].id;
                
                // Asociar la imagen al primer artículo
                const updateQuery = `
                    UPDATE IMAGE 
                    SET article_id = ?,
                        title = 'Portada MILENIO',
                        description = 'Portada del periódico MILENIO correspondiente al primer artículo'
                    WHERE id = ?
                `;
                
                await run(updateQuery, [firstArticleId, imageId]);
                console.log(`✅ Portada de MILENIO asociada correctamente al artículo ID ${firstArticleId}`);
                
                // Verificar el resultado
                const verificationQuery = `
                    SELECT a.id, a.title, i.filename
                    FROM ARTICLE a
                    LEFT JOIN IMAGE i ON a.id = i.article_id
                    WHERE a.source = 'MILENIO'
                    AND a.section_id = 'ocho-columnas'
                    AND date(a.publication_date) = '2025-06-05'
                    ORDER BY a.id
                `;
                
                const results = await query(verificationQuery);
                console.log('\nVerificación:');
                results.forEach(result => {
                    const imageInfo = result.filename || 'Sin imagen';
                    console.log(`  ID ${result.id}: ${imageInfo}`);
                });
                
            } else {
                console.log('❌ No se encontró la imagen portada-milenio.png');
            }
        } else {
            console.log('❌ Se esperaban exactamente 2 artículos de MILENIO');
        }
        
    } catch (error) {
        console.error('Error corrigiendo asociación de MILENIO:', error);
    }
}

fixMilenioAssociation().catch(console.error);