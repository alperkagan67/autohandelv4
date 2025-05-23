import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Alert,
  Snackbar
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import VehicleList from './VehicleManagement/VehicleList';
import VehicleForm from './VehicleManagement/VehicleForm';

function VehicleManagement() {
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || '/api';

  // Fahrzeuge laden
  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/vehicles`);
      if (!response.ok) throw new Error('Fehler beim Laden der Fahrzeuge');
      const data = await response.json();
      setVehicles(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handleAddVehicle = () => {
    setSelectedVehicle(null);
    setFormOpen(true);
  };

  const handleEditVehicle = (vehicle) => {
    setSelectedVehicle(vehicle);
    setFormOpen(true);
  };

  const handleDeleteVehicle = async (vehicle) => {
    if (window.confirm('Sind Sie sicher, dass Sie dieses Fahrzeug löschen möchten?')) {
      try {
        await deleteVehicle(vehicle.id);
        showSnackbar('Fahrzeug erfolgreich gelöscht', 'success');
        fetchVehicles(); // Nach Löschen neu laden
      } catch (error) {
        showSnackbar('Fehler beim Löschen des Fahrzeugs', 'error');
        console.error('Error deleting vehicle:', error);
      }
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleSubmit = async (vehicleData, images) => {
    try {
      if (selectedVehicle) {
        await updateVehicle(selectedVehicle.id, vehicleData, images);
        showSnackbar('Fahrzeug erfolgreich aktualisiert');
      } else {
        await addVehicle(vehicleData, images);
        showSnackbar('Fahrzeug erfolgreich hinzugefügt');
      }
      setFormOpen(false);
      fetchVehicles(); // Nach Hinzufügen/Bearbeiten neu laden
    } catch (error) {
      showSnackbar(error.message || 'Fehler beim Speichern des Fahrzeugs', 'error');
      console.error('Error saving vehicle:', error);
      throw error;
    }
  };

  const handleCloseForm = () => {
    if (window.confirm('Sind Sie sicher, dass Sie das Formular schließen möchten? Nicht gespeicherte Änderungen gehen verloren.')) {
      setFormOpen(false);
    }
  };

  // Hilfsfunktionen für Backend-Requests
  const addVehicle = async (vehicleData, images) => {
    const formData = new FormData();
    // Mapping auf snake_case für Backend, fuel_type immer mit Wert
    const mappedData = {
      brand: vehicleData.brand,
      model: vehicleData.model,
      year: vehicleData.year,
      price: vehicleData.price,
      mileage: vehicleData.mileage,
      fuel_type: vehicleData.fuelType || 'Benzin', // <-- garantiert nie null
      transmission: vehicleData.transmission,
      power: vehicleData.power,
      description: vehicleData.description,
      status: vehicleData.status,
      features: vehicleData.features
    };
    Object.entries(mappedData).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, value ?? '');
      }
    });
    images.forEach(img => formData.append('images', img));

    const response = await fetch(`${API_URL}/vehicles`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: formData,
    });
    if (!response.ok) throw new Error('Fehler beim Speichern des Fahrzeugs');
    return await response.json();
  };

  const updateVehicle = async (id, vehicleData, images) => {
    const formData = new FormData();
    // Mapping auf snake_case für Backend, fuel_type immer mit Wert
    const mappedData = {
      brand: vehicleData.brand,
      model: vehicleData.model,
      year: vehicleData.year,
      price: vehicleData.price,
      mileage: vehicleData.mileage,
      fuel_type: vehicleData.fuelType || 'Benzin', // <-- garantiert nie null
      transmission: vehicleData.transmission,
      power: vehicleData.power,
      description: vehicleData.description,
      status: vehicleData.status,
      features: vehicleData.features
    };
    Object.entries(mappedData).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, value ?? '');
      }
    });
    images.forEach(img => formData.append('images', img));

    const response = await fetch(`${API_URL}/vehicles/${id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: formData,
    });
    if (!response.ok) throw new Error('Fehler beim Aktualisieren des Fahrzeugs');
    return await response.json();
  };

  const deleteVehicle = async (id) => {
    const response = await fetch(`${API_URL}/vehicles/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });
    if (!response.ok) throw new Error('Fehler beim Löschen des Fahrzeugs');
    return await response.json();
  };

  return (
    <Box>
      {/* {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Fehler beim Laden der Fahrzeuge: {error}
        </Alert>
      )} */}

      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5">
          Fahrzeugverwaltung
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddVehicle}
          aria-label="Fahrzeug hinzufügen"
        >
          Fahrzeug hinzufügen
        </Button>
      </Box>

      <VehicleList
        vehicles={vehicles}
        loading={loading}
        error={error}
        onEdit={handleEditVehicle}
        onDelete={handleDeleteVehicle}
      />

      <Dialog
        open={formOpen}
        onClose={handleCloseForm}
        maxWidth="md"
        fullWidth
        keepMounted={false}
        aria-labelledby="vehicle-dialog-title"
      >
        <DialogTitle id="vehicle-dialog-title">
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingRight: 1
          }}>
            <Typography variant="h6">
              {selectedVehicle ? 'Fahrzeug bearbeiten' : 'Neues Fahrzeug'}
            </Typography>
            <IconButton
              onClick={handleCloseForm}
              size="small"
              aria-label="Dialog schließen"
              sx={{
                '&:focus': {
                  outline: 'none'
                }
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <VehicleForm
            vehicle={selectedVehicle}
            onSubmit={handleSubmit}
            onCancel={handleCloseForm}
          />
        </DialogContent>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          elevation={6}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default VehicleManagement; 