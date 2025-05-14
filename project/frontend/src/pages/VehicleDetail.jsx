import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Grid,
  Paper,
  Box,
  Chip,
  Button,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar
} from '@mui/material';
import { useState, useEffect, useCallback } from 'react';
import ImageViewer from '../components/shared/ImageViewer';
// import { formatCurrency } from '../utils/formatters'; // Entfernt
import FileDownloadIcon from '@mui/icons-material/FileDownload';

function formatCurrency(value) { return value + ' €'; }

function VehicleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState(null);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Dummy-Logik: Setze vehicle auf null, um Fehler zu vermeiden
    setVehicle(null);
    setLoading(false);
    setError(null);
  }, [id]);

  const handleImageClick = (index) => {
    setSelectedImageIndex(index);
    setImageViewerOpen(true);
  };

  const handleInquirySubmit = (e) => {
    e.preventDefault();
    try {
      const inquiry = {
        id: Date.now(),
        date: new Date().toISOString(),
        status: 'new',
        customerName: formData.name,
        email: formData.email,
        phone: formData.phone,
        message: formData.message,
        vehicle: {
          id: vehicle.id,
          brand: vehicle.brand,
          model: vehicle.model,
          year: vehicle.year,
          price: vehicle.price
        }
      };

      const inquiries = JSON.parse(localStorage.getItem('vehicleInquiries') || '[]');
      inquiries.unshift(inquiry);
      localStorage.setItem('vehicleInquiries', JSON.stringify(inquiries));

      setInquiryOpen(false);
      setSnackbarOpen(true);
      setFormData({ name: '', email: '', phone: '', message: '' });
    } catch (error) {
      console.error('Error submitting inquiry:', error);
    }
  };

  const handleExposeDownload = () => {
    if (!vehicle?.id) return;
    
    // URL zum Exposé-Endpunkt direkt definieren
    const exposeUrl = `http://localhost:3000/api/vehicles/${vehicle.id}/expose`;
    
    console.log("Öffne URL:", exposeUrl); // Debugging
    
    // Fenster öffnen, um das PDF direkt herunterladen
    window.open(exposeUrl, '_blank');
  };

  const handleImageUpload = async (event) => {
    const files = Array.from(event.target.files);
    console.log('Ausgewählte Dateien:', files.length);
    
    // Validierung der Dateien
    const validFiles = files.filter(file => {
        const isValidType = file.type.startsWith('image/');
        const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB
        
        if (!isValidType) {
            console.error(`Ungültiger Dateityp: ${file.name}`);
            return false;
        }
        if (!isValidSize) {
            console.error(`Datei zu groß: ${file.name}`);
            return false;
        }
        return true;
    });

    if (validFiles.length === 0) {
        alert('Bitte wählen Sie gültige Bilddateien aus (max. 5MB pro Bild)');
        return;
    }

    const formData = new FormData();
    validFiles.forEach((file, index) => {
        console.log(`Füge Bild ${index+1} hinzu:`, file.name, file.size);
        formData.append('images', file);
    });

    try {
        console.log('Sende Bilder an den Server...');
        const response = await fetch(`http://localhost:3000/api/vehicles/${vehicle.id}/images`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Fehler beim Hochladen der Bilder');
        }

        const data = await response.json();
        console.log('Server-Antwort:', data);
        console.log('Hochgeladene Bilder:', data.images);
        
        // Aktualisiere die Fahrzeugdaten mit den neuen Bildern
        setVehicle(prev => ({
            ...prev,
            images: [...(prev.images || []), ...data.images]
        }));
    } catch (error) {
        console.error('Fehler beim Bildupload:', error);
        alert('Fehler beim Hochladen der Bilder: ' + error.message);
    }
  };

  if (loading) {
    return (
      <Container sx={{ py: 8, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ py: 8 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={() => navigate('/vehicles')}>
          Zurück zur Übersicht
        </Button>
      </Container>
    );
  }

  if (!vehicle) {
    return (
      <Container sx={{ py: 8 }}>
        <Alert severity="info">
          Fahrzeug nicht gefunden
        </Alert>
        <Button 
          variant="contained" 
          onClick={() => navigate('/vehicles')}
          sx={{ mt: 2 }}
        >
          Zurück zur Übersicht
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Grid container spacing={4}>
        <Grid item xs={12} md={8}>
          <Box sx={{ position: 'relative' }}>
            {vehicle.images && vehicle.images.length > 0 ? (
              <>
                <Box
                  component="img"
                  src={vehicle.images[0]}
                  alt={`${vehicle.brand} ${vehicle.model}`}
                  sx={{
                    width: '100%',
                    height: 400,
                    objectFit: 'cover',
                    borderRadius: 2,
                    cursor: 'pointer',
                  }}
                  onClick={() => handleImageClick(0)}
                />
                {vehicle.images.length > 1 && (
                  <Box sx={{
                    display: 'flex',
                    gap: 1,
                    mt: 1,
                    overflowX: 'auto',
                    '&::-webkit-scrollbar': { height: 8 },
                    '&::-webkit-scrollbar-thumb': { backgroundColor: 'grey.300', borderRadius: 4 }
                  }}>
                    {vehicle.images.map((image, index) => (
                      <Box
                        key={index}
                        component="img"
                        src={image}
                        alt={`${vehicle.brand} ${vehicle.model} - Bild ${index + 1}`}
                        sx={{
                          width: 100,
                          height: 75,
                          objectFit: 'cover',
                          borderRadius: 1,
                          cursor: 'pointer',
                          opacity: index === selectedImageIndex ? 1 : 0.7,
                          transition: 'opacity 0.2s',
                          '&:hover': { opacity: 1 }
                        }}
                        onClick={() => handleImageClick(index)}
                      />
                    ))}
                  </Box>
                )}
              </>
            ) : (
              <Paper
                sx={{
                  width: '100%',
                  height: 400,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 2,
                }}
              >
                <Typography color="text.secondary">
                  Kein Bild verfügbar
                </Typography>
              </Paper>
            )}
          </Box>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
              {vehicle.brand} {vehicle.model}
            </Typography>
            <Typography variant="h5" color="primary" gutterBottom>
              {formatCurrency(vehicle.price)}
            </Typography>

            <Box sx={{ my: 2 }}>
              <Typography variant="subtitle1" gutterBottom>Technische Daten</Typography>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Typography color="text.secondary">Baujahr</Typography>
                  <Typography>{vehicle.year}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography color="text.secondary">Kilometerstand</Typography>
                  <Typography>{vehicle.mileage?.toLocaleString()} km</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography color="text.secondary">Kraftstoff</Typography>
                  <Typography>{vehicle.fuelType}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography color="text.secondary">Getriebe</Typography>
                  <Typography>{vehicle.transmission}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography color="text.secondary">Leistung</Typography>
                  <Typography>{vehicle.power}</Typography>
                </Grid>
              </Grid>
            </Box>

            <Button
              variant="contained"
              fullWidth
              size="large"
              onClick={() => setInquiryOpen(true)}
              sx={{ mt: 2 }}
            >
              Anfrage senden
            </Button>

            <Button
              variant="outlined"
              fullWidth
              size="large"
              startIcon={<FileDownloadIcon />}
              onClick={handleExposeDownload}
              sx={{ mt: 2 }}
            >
              Exposé herunterladen
            </Button>
          </Paper>

          {vehicle.features && vehicle.features.length > 0 && (
            <Paper sx={{ p: 3, mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Ausstattungsmerkmale
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {vehicle.features.map((feature, index) => (
                  <Chip key={index} label={feature} />
                ))}
              </Box>
            </Paper>
          )}
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Beschreibung
            </Typography>
            <Typography>
              {vehicle.description || 'Keine Beschreibung verfügbar'}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {vehicle.images && (
        <ImageViewer
          images={vehicle.images}
          open={imageViewerOpen}
          onClose={() => setImageViewerOpen(false)}
          initialIndex={selectedImageIndex}
        />
      )}

      <Dialog open={inquiryOpen} onClose={() => setInquiryOpen(false)}>
        <form onSubmit={handleInquirySubmit}>
          <DialogTitle>Fahrzeuganfrage</DialogTitle>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label="Name"
                  name="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    name: e.target.value
                  }))}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  type="email"
                  label="E-Mail"
                  name="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    email: e.target.value
                  }))}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label="Telefon"
                  name="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    phone: e.target.value
                  }))}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Ihre Nachricht"
                  name="message"
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    message: e.target.value
                  }))}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setInquiryOpen(false)}>
              Abbrechen
            </Button>
            <Button type="submit" variant="contained">
              Anfrage senden
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        message="Ihre Anfrage wurde erfolgreich gesendet!"
      />
    </Container>
  );
}

export default VehicleDetail;