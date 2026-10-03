import { Router, Request, Response } from 'express';
import { DEFAULT_SCHOOL_LOCATION } from '../lib/defaults.js';
import { supabaseLocation } from '../lib/supabase.js';
import { SchoolLocation } from '../../types.js';

const router = Router();

// 1. GET /api/location (Get school location and radius from Supabase)
router.get('/', async (req: Request, res: Response) => {
  try {
    const dbLoc = await supabaseLocation.get();
    if (!dbLoc) {
      // Fallback only if database has no record yet
      return res.json({
        success: true,
        source: 'default',
        location: DEFAULT_SCHOOL_LOCATION,
      });
    }

    return res.json({
      success: true,
      source: 'supabase',
      location: dbLoc,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Gagal membaca lokasi dari database Supabase: ' + err.message,
    });
  }
});

// 2. PUT /api/location (Admin update school location & radius in Supabase)
router.put('/', async (req: Request, res: Response) => {
  try {
    const { school_name, latitude, longitude, radius_meters, address } = req.body;

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Koordinat latitude dan longitude valid wajib disertakan.',
      });
    }

    const current = (await supabaseLocation.get()) || { ...DEFAULT_SCHOOL_LOCATION };
    if (school_name) current.school_name = school_name.trim();
    current.latitude = latitude;
    current.longitude = longitude;
    if (typeof radius_meters === 'number' && radius_meters > 0) {
      current.radius_meters = radius_meters;
    }
    if (address !== undefined) current.address = String(address).trim();
    current.updated_at = new Date().toISOString();

    const updatedLocation = await supabaseLocation.update(current);

    if (!updatedLocation) {
      return res.status(500).json({
        success: false,
        message: 'Gagal menyimpan ke database Supabase! Periksa koneksi Supabase di server.',
      });
    }

    return res.json({
      success: true,
      source: 'supabase',
      message: 'Titik koordinat dan alamat sekolah berhasil disimpan ke database Supabase.',
      location: updatedLocation,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Gagal memperbarui lokasi sekolah: ' + (error.message || error),
    });
  }
});

export default router;
