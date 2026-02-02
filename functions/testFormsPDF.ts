import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { company } = body;

        if (!company) {
            return Response.json({ error: 'Company data required' }, { status: 400 });
        }

        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;
        let yPos = margin;

        // Helper function to add image with error handling and aspect ratio
        const addImageWithDebug = async (imageUrl, x, y, maxWidth, maxHeight, label) => {
            console.log(`🖼️ [TEST PDF] Attempting to load image: ${label}`);
            console.log(`   URL: ${imageUrl}`);
            
            if (!imageUrl) {
                console.log(`   ❌ No URL provided for ${label}`);
                return { success: false, error: 'No URL provided' };
            }

            try {
                console.log(`   📥 Fetching image...`);
                const response = await fetch(imageUrl);
                
                console.log(`   Response status: ${response.status}`);
                console.log(`   Content-Type: ${response.headers.get('content-type')}`);
                
                if (!response.ok) {
                    console.log(`   ❌ Fetch failed: ${response.status} ${response.statusText}`);
                    return { success: false, error: `Fetch failed: ${response.status}` };
                }

                const arrayBuffer = await response.arrayBuffer();
                const uint8Array = new Uint8Array(arrayBuffer);
                console.log(`   📦 Image size: ${uint8Array.length} bytes`);

                // Detect image type and get dimensions
                let imageType = 'PNG';
                let imgWidth = 0;
                let imgHeight = 0;
                
                if (uint8Array[0] === 0xFF && uint8Array[1] === 0xD8) {
                    imageType = 'JPEG';
                    // Parse JPEG dimensions
                    for (let i = 0; i < uint8Array.length - 1; i++) {
                        if (uint8Array[i] === 0xFF && (uint8Array[i + 1] === 0xC0 || uint8Array[i + 1] === 0xC2)) {
                            imgHeight = (uint8Array[i + 5] << 8) | uint8Array[i + 6];
                            imgWidth = (uint8Array[i + 7] << 8) | uint8Array[i + 8];
                            break;
                        }
                    }
                } else if (uint8Array[0] === 0x89 && uint8Array[1] === 0x50) {
                    imageType = 'PNG';
                    // PNG dimensions are at bytes 16-23
                    imgWidth = (uint8Array[16] << 24) | (uint8Array[17] << 16) | (uint8Array[18] << 8) | uint8Array[19];
                    imgHeight = (uint8Array[20] << 24) | (uint8Array[21] << 16) | (uint8Array[22] << 8) | uint8Array[23];
                }
                
                console.log(`   🔍 Detected type: ${imageType}, dimensions: ${imgWidth}x${imgHeight}`);

                // Calculate dimensions maintaining aspect ratio
                let finalWidth = maxWidth;
                let finalHeight = maxHeight;
                
                if (imgWidth > 0 && imgHeight > 0) {
                    const aspectRatio = imgWidth / imgHeight;
                    
                    // Fit within maxWidth and maxHeight while maintaining aspect ratio
                    if (maxWidth / maxHeight > aspectRatio) {
                        // Height is the limiting factor
                        finalHeight = maxHeight;
                        finalWidth = maxHeight * aspectRatio;
                    } else {
                        // Width is the limiting factor
                        finalWidth = maxWidth;
                        finalHeight = maxWidth / aspectRatio;
                    }
                }
                
                console.log(`   📐 Final dimensions: ${finalWidth.toFixed(1)}x${finalHeight.toFixed(1)}mm`);

                // Convert to base64
                let binary = '';
                for (let i = 0; i < uint8Array.length; i++) {
                    binary += String.fromCharCode(uint8Array[i]);
                }
                const base64 = btoa(binary);
                console.log(`   📝 Base64 length: ${base64.length}`);

                // Add to PDF with correct aspect ratio
                const imgData = `data:image/${imageType.toLowerCase()};base64,${base64}`;
                doc.addImage(imgData, imageType, x, y, finalWidth, finalHeight);
                console.log(`   ✅ Image added to PDF successfully!`);

                return { success: true, type: imageType, size: uint8Array.length, width: finalWidth, height: finalHeight };
            } catch (error) {
                console.error(`   ❌ Error loading image:`, error.message);
                return { success: false, error: error.message };
            }
        };

        // Title
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(79, 70, 229); // Indigo
        doc.text('PDF FORMS TEST - Logo Debug Report', pageWidth / 2, yPos, { align: 'center' });
        yPos += 15;

        // Company info
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(`Company: ${company.name || 'N/A'}`, margin, yPos);
        yPos += 7;
        doc.text(`Generated: ${new Date().toISOString()}`, margin, yPos);
        yPos += 7;
        doc.text(`Generated by: ${user.email}`, margin, yPos);
        yPos += 15;

        // Separator
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 10;

        // === SECTION 1: Logo URLs ===
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(220, 38, 38); // Red
        doc.text('1. LOGO URLs CONFIGURATION', margin, yPos);
        yPos += 10;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);

        const urls = [
            { label: 'logo_url (Main)', value: company.logo_url },
            { label: 'logo_forms_url (Forms/PDF)', value: company.logo_forms_url },
            { label: 'logo_collapsed_url (Sidebar)', value: company.logo_collapsed_url }
        ];

        for (const url of urls) {
            doc.setFont('helvetica', 'bold');
            doc.text(`${url.label}:`, margin, yPos);
            yPos += 5;
            doc.setFont('helvetica', 'normal');
            
            const urlText = url.value || 'NOT SET';
            // Split long URLs
            const urlLines = doc.splitTextToSize(urlText, pageWidth - margin * 2);
            doc.text(urlLines, margin + 5, yPos);
            yPos += urlLines.length * 4 + 5;
        }

        yPos += 5;

        // === SECTION 2: Image Loading Tests ===
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(220, 38, 38);
        doc.text('2. IMAGE LOADING TESTS', margin, yPos);
        yPos += 10;

        // Test Main Logo
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Main Logo (logo_url):', margin, yPos);
        yPos += 5;

        const logoBoxY = yPos;

        if (company.logo_url) {
            const mainLogoResult = await addImageWithDebug(company.logo_url, margin, yPos, 50, 20, 'Main Logo');
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text(
                mainLogoResult.success 
                    ? `✓ Loaded (${mainLogoResult.type}, ${mainLogoResult.size} bytes)` 
                    : `✗ Failed: ${mainLogoResult.error}`,
                margin + 55, yPos + 10
            );
        } else {
            doc.setFontSize(8);
            doc.text('No URL configured', margin + 55, yPos + 10);
        }
        yPos += 25;

        // Test Forms Logo
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Forms Logo (logo_forms_url):', margin, yPos);
        yPos += 5;

        if (company.logo_forms_url) {
            const formsLogoResult = await addImageWithDebug(company.logo_forms_url, margin, yPos, 50, 20, 'Forms Logo');
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text(
                formsLogoResult.success 
                    ? `✓ Loaded (${formsLogoResult.type}, ${formsLogoResult.size} bytes)` 
                    : `✗ Failed: ${formsLogoResult.error}`,
                margin + 55, yPos + 10
            );
        } else {
            doc.setFontSize(8);
            doc.text('No URL configured', margin + 55, yPos + 10);
        }
        yPos += 30;

        // === SECTION 3: Sample Form Header ===
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(220, 38, 38);
        doc.text('3. SAMPLE FORM HEADER (as it would appear in Working Report)', margin, yPos);
        yPos += 10;

        // Draw sample header box
        doc.setDrawColor(200, 200, 200);
        doc.setFillColor(250, 250, 250);
        doc.rect(margin, yPos, pageWidth - margin * 2, 40, 'FD');

        // Left side: Company info
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(220, 38, 38);
        doc.text(company.name || 'COMPANY NAME', margin + 5, yPos + 8);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(`Contact: ${company.phone || 'Not set'}`, margin + 5, yPos + 14);
        doc.text(`Email: ${company.email || 'Not set'}`, margin + 5, yPos + 19);
        doc.text(`TRN: ${company.tax_number || 'Not set'}`, margin + 5, yPos + 24);
        doc.text(`Address: ${company.address || 'Not set'}`, margin + 5, yPos + 29);

        // Right side: Logo (sin recuadro)
        const logoX = pageWidth - margin - 55;
        const logoY = yPos + 3;

        // Try to add the forms logo, fall back to main logo
        const logoToUse = company.logo_forms_url || company.logo_url;
        if (logoToUse) {
            await addImageWithDebug(logoToUse, logoX, logoY, 50, 30, 'Header Logo');
        } else {
            doc.setFontSize(7);
            doc.text('NO LOGO', logoX + 15, logoY + 8);
        }

        // Red line under header
        doc.setDrawColor(220, 38, 38);
        doc.setLineWidth(1);
        doc.line(margin, yPos + 35, pageWidth - margin, yPos + 35);
        doc.setLineWidth(0.2);

        yPos += 50;

        // === SECTION 4: Troubleshooting Info ===
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(220, 38, 38);
        doc.text('4. TROUBLESHOOTING INFO', margin, yPos);
        yPos += 10;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);

        const troubleshootingItems = [
            'If logo_forms_url shows "Loaded" but Working Report PDFs still have no logo:',
            '  → The issue is in generateWorkOrderPDF function logic',
            '  → Check if company.logo_forms_url is being passed correctly',
            '',
            'If logo shows "Failed to load":',
            '  → Check if URL is publicly accessible (try opening in browser)',
            '  → Check if URL has CORS restrictions',
            '  → Check if image format is supported (PNG, JPEG, GIF)',
            '',
            'Common issues:',
            '  → Private storage URLs need signed URLs to be accessible',
            '  → Very large images may fail due to memory limits',
            '  → WebP format is NOT supported by jsPDF'
        ];

        for (const item of troubleshootingItems) {
            doc.text(item, margin, yPos);
            yPos += 5;
        }

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
            `Test PDF generated at ${new Date().toLocaleString()} | Page 1 of 1`,
            pageWidth / 2,
            pageHeight - 10,
            { align: 'center' }
        );

        const pdfBytes = doc.output('arraybuffer');

        return new Response(pdfBytes, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename=logo_test_${company.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'company'}.pdf`
            }
        });
    } catch (error) {
        console.error('❌ [TEST PDF] Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});